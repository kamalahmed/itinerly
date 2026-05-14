import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import prisma from "@/lib/db";
import { makeQuery, makeOffer } from "../fixtures";

// Stub the network-bound providers; `mock` stays real (hits the seeded DB).
vi.mock("@/lib/providers/amadeus", () => ({
  amadeus: { name: "amadeus", searchOffers: vi.fn() },
}));
vi.mock("@/lib/providers/duffel", () => ({
  duffel: { name: "duffel", searchOffers: vi.fn() },
}));

import { searchWithChain, getProvider } from "@/lib/providers";
import { amadeus } from "@/lib/providers/amadeus";
import { duffel } from "@/lib/providers/duffel";

const ENV_KEYS = [
  "FLIGHT_PROVIDER",
  "AMADEUS_CLIENT_ID",
  "AMADEUS_CLIENT_SECRET",
] as const;
let savedEnv: Record<string, string | undefined> = {};

beforeEach(async () => {
  savedEnv = {};
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  vi.mocked(amadeus.searchOffers).mockReset();
  vi.mocked(duffel.searchOffers).mockReset();
  await prisma.searchCache.deleteMany();
});

afterEach(async () => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  await prisma.searchCache.deleteMany();
});

describe("searchWithChain — default chain", () => {
  it("serves a seeded route from the mock provider", async () => {
    const r = await searchWithChain(makeQuery());
    expect(r.source).toBe("mock");
    expect(r.offers.length).toBeGreaterThanOrEqual(1);
    expect(amadeus.searchOffers).not.toHaveBeenCalled();
  });

  it("caches a successful search and serves the next call from cache", async () => {
    const first = await searchWithChain(makeQuery());
    expect(first.source).toBe("mock");

    const second = await searchWithChain(makeQuery());
    expect(second.source).toBe("cache");
    expect(second.offers.length).toBe(first.offers.length);
  });

  it("returns an empty result with source 'none' when nothing matches", async () => {
    const r = await searchWithChain(makeQuery({ destination: "ZZZ" }));
    expect(r.source).toBe("none");
    expect(r.offers).toEqual([]);
  });
});

describe("searchWithChain — amadeus fallback", () => {
  it("falls back to amadeus when mock is empty and credentials are set", async () => {
    process.env.AMADEUS_CLIENT_ID = "test-id";
    process.env.AMADEUS_CLIENT_SECRET = "test-secret";
    vi.mocked(amadeus.searchOffers).mockResolvedValue([
      makeOffer({ id: "amadeus-1", provider: "amadeus" }),
    ]);

    const r = await searchWithChain(makeQuery({ destination: "ZZZ" }));
    expect(amadeus.searchOffers).toHaveBeenCalledOnce();
    expect(r.source).toBe("amadeus");
    expect(r.offers[0].provider).toBe("amadeus");
  });

  it("does not call amadeus when credentials are missing", async () => {
    const r = await searchWithChain(makeQuery({ destination: "ZZZ" }));
    expect(amadeus.searchOffers).not.toHaveBeenCalled();
    expect(r.source).toBe("none");
  });

  it("swallows an amadeus error and returns an empty result", async () => {
    process.env.AMADEUS_CLIENT_ID = "test-id";
    process.env.AMADEUS_CLIENT_SECRET = "test-secret";
    vi.mocked(amadeus.searchOffers).mockRejectedValue(new Error("boom"));

    const r = await searchWithChain(makeQuery({ destination: "ZZZ" }));
    expect(r.source).toBe("none");
    expect(r.offers).toEqual([]);
  });
});

describe("searchWithChain — explicit FLIGHT_PROVIDER override", () => {
  it("uses duffel directly when FLIGHT_PROVIDER=duffel", async () => {
    process.env.FLIGHT_PROVIDER = "duffel";
    vi.mocked(duffel.searchOffers).mockResolvedValue([
      makeOffer({ id: "duffel-1", provider: "duffel" }),
    ]);

    const r = await searchWithChain(makeQuery());
    expect(duffel.searchOffers).toHaveBeenCalledOnce();
    expect(r.source).toBe("duffel");
    expect(r.offers[0].provider).toBe("duffel");
  });
});

describe("getProvider", () => {
  it("defaults to the mock provider", () => {
    expect(getProvider().name).toBe("mock");
  });

  it("returns the provider named by FLIGHT_PROVIDER", () => {
    process.env.FLIGHT_PROVIDER = "amadeus";
    expect(getProvider().name).toBe("amadeus");
  });

  it("falls back to mock for an unknown provider name", () => {
    process.env.FLIGHT_PROVIDER = "nonsense";
    expect(getProvider().name).toBe("mock");
  });
});
