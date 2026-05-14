import { describe, it, expect } from "vitest";
import { mock } from "@/lib/providers/mock";
import { makeQuery } from "../fixtures";

describe("mock provider — one-way", () => {
  it("returns seeded DAC→DXB offers", async () => {
    const offers = await mock.searchOffers(makeQuery());
    expect(offers.length).toBeGreaterThanOrEqual(1);
    for (const o of offers) {
      expect(o.provider).toBe("mock");
      expect(o.outboundSegments[0].origin.iata).toBe("DAC");
      expect(o.outboundSegments[0].destination.iata).toBe("DXB");
      expect(o.returnSegments).toBeUndefined();
      expect(o.stops).toBe(0); // mock models direct flights only
    }
  });

  it("orders offers by ascending total price", async () => {
    const offers = await mock.searchOffers(makeQuery());
    for (let i = 1; i < offers.length; i++) {
      expect(offers[i].totalPriceUSD).toBeGreaterThanOrEqual(
        offers[i - 1].totalPriceUSD
      );
    }
  });

  it("splits the fare into base + taxes that sum to the total", async () => {
    const [offer] = await mock.searchOffers(makeQuery());
    expect(offer.baseFareUSD + offer.taxesUSD).toBe(offer.totalPriceUSD);
  });

  it("returns no offers for an unseeded route", async () => {
    const offers = await mock.searchOffers(
      makeQuery({ destination: "ZZZ" })
    );
    expect(offers).toEqual([]);
  });

  it("serves secondary Bangladesh airports (CGP→DXB)", async () => {
    const offers = await mock.searchOffers(
      makeQuery({ origin: "CGP", destination: "DXB" })
    );
    expect(offers.length).toBeGreaterThanOrEqual(1);
    expect(offers[0].outboundSegments[0].origin.iata).toBe("CGP");
  });
});

describe("mock provider — pricing", () => {
  it("prices business class above economy", async () => {
    const econ = await mock.searchOffers(makeQuery({ cabin: "economy" }));
    const biz = await mock.searchOffers(makeQuery({ cabin: "business" }));
    expect(biz[0].totalPriceUSD).toBeGreaterThan(econ[0].totalPriceUSD);
  });

  it("scales price with passenger count", async () => {
    const one = await mock.searchOffers(makeQuery({ adults: 1 }));
    const two = await mock.searchOffers(makeQuery({ adults: 2 }));
    expect(two[0].totalPriceUSD).toBeGreaterThan(one[0].totalPriceUSD);
  });
});

describe("mock provider — preferences", () => {
  it("floats the preferred airline to the top", async () => {
    const offers = await mock.searchOffers(
      makeQuery({ preferredAirline: "BG" })
    );
    expect(offers[0].outboundSegments[0].carrier.iata).toBe("BG");
  });
});

describe("mock provider — round trip", () => {
  it("returns offers with a synthesized reversed return leg", async () => {
    const offers = await mock.searchOffers(
      makeQuery({
        tripType: "round_trip",
        returnDate: "2026-06-10",
      })
    );
    expect(offers.length).toBeGreaterThanOrEqual(1);
    const o = offers[0];
    expect(o.returnSegments?.length).toBeGreaterThanOrEqual(1);
    // Return leg flies DXB → DAC.
    expect(o.returnSegments![0].origin.iata).toBe("DXB");
    expect(o.returnSegments![0].destination.iata).toBe("DAC");
    // Outbound still flies DAC → DXB.
    expect(o.outboundSegments[0].origin.iata).toBe("DAC");
  });

  it("prices a round trip above the equivalent one-way", async () => {
    const ow = await mock.searchOffers(makeQuery());
    const rt = await mock.searchOffers(
      makeQuery({ tripType: "round_trip", returnDate: "2026-06-10" })
    );
    expect(rt[0].totalPriceUSD).toBeGreaterThan(ow[0].totalPriceUSD);
  });
});
