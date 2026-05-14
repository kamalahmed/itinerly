import { describe, it, expect } from "vitest";
import { mock } from "@/lib/providers/mock";
import { searchWithChain } from "@/lib/providers";
import type { SearchQuery } from "@/lib/types";

const DAC_DXB: SearchQuery = {
  origin: "DAC",
  destination: "DXB",
  departDate: "2026-06-01",
  cabin: "economy",
  adults: 1,
  children: 0,
  infants: 0,
  tripType: "one_way",
};

describe("mock flight provider", () => {
  it("returns at least one DAC→DXB offer", async () => {
    const offers = await mock.searchOffers(DAC_DXB);
    expect(offers.length).toBeGreaterThanOrEqual(1);
    expect(offers[0].outboundSegments[0].origin.iata).toBe("DAC");
    expect(offers[0].outboundSegments[0].destination.iata).toBe("DXB");
  });

  it("orders offers by ascending price", async () => {
    const offers = await mock.searchOffers(DAC_DXB);
    for (let i = 1; i < offers.length; i++) {
      expect(offers[i].totalPriceUSD).toBeGreaterThanOrEqual(
        offers[i - 1].totalPriceUSD
      );
    }
  });

  it("returns no offers for an unseeded route", async () => {
    const offers = await mock.searchOffers({
      ...DAC_DXB,
      origin: "DAC",
      destination: "ZZZ",
    });
    expect(offers).toEqual([]);
  });
});

describe("searchWithChain", () => {
  it("serves DAC→DXB from the mock provider and caches it", async () => {
    const first = await searchWithChain(DAC_DXB);
    expect(first.offers.length).toBeGreaterThanOrEqual(1);
    expect(["mock", "cache"]).toContain(first.source);

    // Second call should hit the SearchCache.
    const second = await searchWithChain(DAC_DXB);
    expect(second.source).toBe("cache");
    expect(second.offers.length).toBe(first.offers.length);
  });
});
