import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Cache is a no-op (always fetch) and airports come from fixtures, so we can
// test the parsing/pricing logic without a DB or the live API.
vi.mock("@/lib/db", () => ({
  default: {
    searchCache: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("@/lib/airports", () => ({
  getAirport: vi.fn(async (iata: string) => {
    const map: Record<string, { timeZone: string; lat: number; lon: number }> = {
      DAC: { timeZone: "Asia/Dhaka", lat: 23.84, lon: 90.4 },
      DXB: { timeZone: "Asia/Dubai", lat: 25.25, lon: 55.36 },
    };
    const m = map[iata];
    return m ? { iata, name: iata, city: iata, country: "", countryCode: "", ...m } : null;
  }),
  getAirline: vi.fn(async () => null),
}));

import { aviationstack } from "@/lib/providers/aviationstack";

const SAMPLE = {
  data: [
    { flight: { number: "341", iata: "BS341", codeshared: null }, airline: { name: "US-Bangla Airlines", iata: "BS" }, departure: { iata: "DAC", scheduled: "2026-06-20T22:55:00+00:00", terminal: "1" }, arrival: { iata: "DXB", scheduled: "2026-06-21T02:00:00+00:00", terminal: "1" } },
    { flight: { number: "6587", iata: "FZ6587", codeshared: { airline_name: "flydubai" } }, airline: { name: "Air Canada", iata: "AC" }, departure: { iata: "DAC", scheduled: "2026-06-20T19:30:00+00:00" }, arrival: { iata: "DXB", scheduled: "2026-06-20T22:30:00+00:00" } },
    { flight: { number: "502", iata: "FZ502", codeshared: null }, airline: { name: "flydubai", iata: "FZ" }, departure: { iata: "DAC", scheduled: "2026-06-20T08:10:00+00:00", terminal: "1" }, arrival: { iata: "DXB", scheduled: "2026-06-20T11:15:00+00:00", terminal: "1" } },
  ],
};

function q(over: Record<string, unknown> = {}) {
  return {
    origin: "DAC", destination: "DXB", departDate: "2026-08-15",
    cabin: "economy" as const, adults: 1, children: 0, infants: 0,
    tripType: "one_way" as const, ...over,
  };
}

beforeEach(() => {
  process.env.AVIATIONSTACK_API_KEY = "test-key";
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => SAMPLE,
  })) as unknown as typeof fetch);
});
afterEach(() => {
  delete process.env.AVIATIONSTACK_API_KEY;
  vi.unstubAllGlobals();
});

describe("aviationstack provider", () => {
  it("returns real flights, drops codeshares, projects onto the search date", async () => {
    const offers = await aviationstack.searchOffers(q());
    // BS341 + FZ502 (the AC codeshare of the FZ flight is dropped).
    expect(offers).toHaveLength(2);
    const numbers = offers.map((o) => o.outboundSegments[0].flightNumber);
    expect(numbers).toContain("BS 341");
    expect(numbers).toContain("FZ 502");
    expect(numbers).not.toContain("AC 6587");

    for (const o of offers) {
      expect(o.provider).toBe("aviationstack");
      expect(o.totalPriceUSD).toBeGreaterThan(0);
      // Departure projected onto the requested date.
      expect(o.outboundSegments[0].departureLocal.slice(0, 10)).toBe("2026-08-15");
    }
  });

  it("handles overnight arrivals on the next calendar day", async () => {
    const offers = await aviationstack.searchOffers(q());
    const bs = offers.find((o) => o.outboundSegments[0].flightNumber === "BS 341")!;
    const seg = bs.outboundSegments[0];
    expect(seg.departureLocal.slice(11, 16)).toBe("22:55");
    expect(seg.arrivalLocal.slice(0, 10)).toBe("2026-08-16"); // +1 day
    expect(seg.arrivalLocal.slice(11, 16)).toBe("02:00");
  });

  it("returns nothing for a route with no flights (so the chain falls back)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ data: [] }) })) as unknown as typeof fetch);
    const offers = await aviationstack.searchOffers(q({ destination: "ZZZ" }));
    expect(offers).toEqual([]);
  });
});
