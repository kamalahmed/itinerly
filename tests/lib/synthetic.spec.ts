import { describe, it, expect } from "vitest";
import {
  haversineKm,
  estimateBlockMinutes,
  synthesizeOffers,
} from "@/lib/synthetic";
import type { Airport, Airline, SearchQuery } from "@/lib/types";

function ap(
  iata: string,
  countryCode: string,
  timeZone: string,
  lat: number,
  lon: number
): Airport {
  return { iata, name: iata, city: iata, country: countryCode, countryCode, timeZone, lat, lon };
}

const DXB = ap("DXB", "AE", "Asia/Dubai", 25.25, 55.36);
const LHR = ap("LHR", "GB", "Europe/London", 51.47, -0.46);
const SIN = ap("SIN", "SG", "Asia/Singapore", 1.36, 103.99);
const JFK = ap("JFK", "US", "America/New_York", 40.64, -73.78);
const DOH = ap("DOH", "QA", "Asia/Qatar", 25.27, 51.61);
const HKG = ap("HKG", "HK", "Asia/Hong_Kong", 22.31, 113.91);
const IST = ap("IST", "TR", "Europe/Istanbul", 41.26, 28.74);

const AIRPORTS = [DXB, LHR, SIN, JFK, DOH, HKG, IST];
const AIRLINES: Airline[] = [
  { iata: "EK", name: "Emirates", logo: "", countryCode: "AE" },
  { iata: "BA", name: "British Airways", logo: "", countryCode: "GB" },
  { iata: "SQ", name: "Singapore Airlines", logo: "", countryCode: "SG" },
  { iata: "AA", name: "American Airlines", logo: "", countryCode: "US" },
  { iata: "QR", name: "Qatar Airways", logo: "", countryCode: "QA" },
  { iata: "CX", name: "Cathay Pacific", logo: "", countryCode: "HK" },
  { iata: "TK", name: "Turkish Airlines", logo: "", countryCode: "TR" },
];

function q(over: Partial<SearchQuery>): SearchQuery {
  return {
    origin: "DXB", destination: "LHR", departDate: "2026-08-15",
    cabin: "economy", adults: 1, children: 0, infants: 0,
    tripType: "one_way", ...over,
  };
}

describe("distance + duration", () => {
  it("computes a sane great-circle distance (DXB→LHR ≈ 5500km)", () => {
    const km = haversineKm(DXB, LHR);
    expect(km).toBeGreaterThan(5000);
    expect(km).toBeLessThan(6000);
  });
  it("estimates a longer block for a longer leg", () => {
    expect(estimateBlockMinutes(5500)).toBeGreaterThan(estimateBlockMinutes(1000));
  });
});

describe("synthesizeOffers", () => {
  it("returns direct flights by the two flag carriers for a medium route", () => {
    const offers = synthesizeOffers(DXB, LHR, AIRPORTS, AIRLINES, q({ origin: "DXB", destination: "LHR" }));
    expect(offers.length).toBeGreaterThanOrEqual(1);
    for (const o of offers) expect(o.stops).toBe(0);
    const carriers = offers.map((o) => o.outboundSegments[0].carrier.iata);
    expect(carriers).toContain("EK"); // origin (UAE) flag carrier
    expect(carriers).toContain("BA"); // destination (UK) flag carrier
  });

  it("builds a hub connection for an ultra-long route (SIN→JFK)", () => {
    const offers = synthesizeOffers(SIN, JFK, AIRPORTS, AIRLINES, q({ origin: "SIN", destination: "JFK" }));
    expect(offers.length).toBeGreaterThanOrEqual(1);
    const o = offers[0];
    expect(o.stops).toBe(1);
    expect(o.outboundSegments).toHaveLength(2);
    // First leg starts at SIN, last leg ends at JFK, via a hub.
    expect(o.outboundSegments[0].origin.iata).toBe("SIN");
    expect(o.outboundSegments[1].destination.iata).toBe("JFK");
    expect(o.outboundSegments[0].destination.iata).toBe(o.outboundSegments[1].origin.iata);
  });

  it("adds a return for round trips", () => {
    const offers = synthesizeOffers(DXB, LHR, AIRPORTS, AIRLINES, q({
      origin: "DXB", destination: "LHR", tripType: "round_trip", returnDate: "2026-08-29",
    }));
    const o = offers[0];
    expect(o.returnSegments).toBeTruthy();
    expect(o.returnSegments![0].origin.iata).toBe("LHR");
    expect(o.returnSegments![o.returnSegments!.length - 1].destination.iata).toBe("DXB");
    expect(o.returnSegments![0].departureLocal.slice(0, 10)).toBe("2026-08-29");
  });
});
