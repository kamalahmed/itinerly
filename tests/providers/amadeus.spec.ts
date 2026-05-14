import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { amadeus } from "@/lib/providers/amadeus";
import { makeQuery } from "../fixtures";

/**
 * Amadeus provider — fetch is stubbed so we exercise OAuth + the response
 * normalization without hitting the network.
 */

const TOKEN_RESPONSE = {
  access_token: "fake-token",
  expires_in: 1800,
};

const OFFERS_RESPONSE = {
  data: [
    {
      id: "1",
      itineraries: [
        {
          duration: "PT5H40M",
          segments: [
            {
              departure: { iataCode: "DAC", terminal: "1", at: "2026-06-01T08:10:00" },
              arrival: { iataCode: "DXB", terminal: "2", at: "2026-06-01T11:50:00" },
              carrierCode: "FZ",
              number: "502",
              aircraft: { code: "7M8" },
              duration: "PT5H40M",
            },
          ],
        },
      ],
      price: { total: "322.50", base: "230.00", currency: "USD" },
      travelerPricings: [
        { fareDetailsBySegment: [{ cabin: "ECONOMY" }] },
      ],
    },
  ],
  dictionaries: {
    carriers: { FZ: "FLYDUBAI" },
    aircraft: { "7M8": "BOEING 737 MAX 8" },
  },
};

function mockFetch() {
  return vi.fn(async (url: string) => {
    if (url.includes("/v1/security/oauth2/token")) {
      return { ok: true, json: async () => TOKEN_RESPONSE } as Response;
    }
    if (url.includes("/v2/shopping/flight-offers")) {
      return { ok: true, json: async () => OFFERS_RESPONSE } as Response;
    }
    throw new Error(`unexpected url ${url}`);
  });
}

beforeEach(() => {
  process.env.AMADEUS_CLIENT_ID = "id";
  process.env.AMADEUS_CLIENT_SECRET = "secret";
  global.fetch = mockFetch() as unknown as typeof fetch;
});

afterEach(() => {
  delete process.env.AMADEUS_CLIENT_ID;
  delete process.env.AMADEUS_CLIENT_SECRET;
  vi.restoreAllMocks();
});

describe("amadeus provider", () => {
  it("authenticates then normalizes a flight-offers response", async () => {
    const offers = await amadeus.searchOffers(makeQuery());

    expect(offers).toHaveLength(1);
    const o = offers[0];
    expect(o.provider).toBe("amadeus");
    expect(o.id).toBe("amadeus-1");
    expect(o.totalPriceUSD).toBe(322.5);
    expect(o.baseFareUSD).toBe(230);
    expect(o.taxesUSD).toBeCloseTo(92.5, 2);
    expect(o.stops).toBe(0);
  });

  it("maps segment fields including the ISO-8601 duration", async () => {
    const [o] = await amadeus.searchOffers(makeQuery());
    const seg = o.outboundSegments[0];
    expect(seg.flightNumber).toBe("FZ 502");
    expect(seg.carrier.name).toBe("FLYDUBAI");
    expect(seg.aircraft).toBe("BOEING 737 MAX 8");
    expect(seg.durationMinutes).toBe(340); // PT5H40M
    expect(seg.originTerminal).toBe("1");
    expect(seg.destinationTerminal).toBe("2");
  });

  it("resolves seeded airports for IATA codes", async () => {
    const [o] = await amadeus.searchOffers(makeQuery());
    // DAC/DXB are in the seeded DB, so the city should resolve.
    expect(o.outboundSegments[0].origin.city).toBe("Dhaka");
  });

  it("throws when credentials are missing", async () => {
    // The provider caches its OAuth token at module scope — load a fresh copy
    // so a token cached by an earlier test doesn't mask the missing creds.
    delete process.env.AMADEUS_CLIENT_ID;
    delete process.env.AMADEUS_CLIENT_SECRET;
    vi.resetModules();
    const { amadeus: freshAmadeus } = await import("@/lib/providers/amadeus");
    await expect(freshAmadeus.searchOffers(makeQuery())).rejects.toThrow(
      /AMADEUS_CLIENT_ID/
    );
  });

  it("throws when the offers request fails", async () => {
    global.fetch = vi.fn(async (url: string) => {
      if (url.includes("oauth2/token")) {
        return { ok: true, json: async () => TOKEN_RESPONSE } as Response;
      }
      return {
        ok: false,
        status: 500,
        text: async () => "server error",
      } as Response;
    }) as unknown as typeof fetch;

    await expect(amadeus.searchOffers(makeQuery())).rejects.toThrow(
      /Amadeus search failed/
    );
  });
});
