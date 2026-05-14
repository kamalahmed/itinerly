import { createHash } from "crypto";
import prisma from "@/lib/db";
import type { FlightOffer, FlightProvider, SearchQuery } from "@/lib/types";
import { mock } from "./mock";
import { amadeus } from "./amadeus";
import { duffel } from "./duffel";

export type { FlightProvider } from "@/lib/types";

const PROVIDERS: Record<string, FlightProvider> = {
  mock,
  amadeus,
  duffel,
};

/** Single provider selected by FLIGHT_PROVIDER (defaults to mock). */
export function getProvider(): FlightProvider {
  const name = process.env.FLIGHT_PROVIDER ?? "mock";
  return PROVIDERS[name] ?? mock;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function cacheKey(q: SearchQuery): string {
  const pax = q.adults + q.children + q.infants;
  const raw = [
    q.origin,
    q.destination,
    q.departDate,
    q.returnDate ?? "",
    q.tripType,
    q.cabin,
    pax,
    q.preferredAirline ?? "",
    q.nonStopOnly ? "1" : "0",
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}

async function readCache(key: string): Promise<FlightOffer[] | null> {
  const row = await prisma.searchCache.findUnique({ where: { key } });
  if (!row) return null;
  if (Date.now() - row.createdAt.getTime() > CACHE_TTL_MS) {
    await prisma.searchCache.delete({ where: { key } }).catch(() => {});
    return null;
  }
  try {
    return JSON.parse(row.offersJson) as FlightOffer[];
  } catch {
    return null;
  }
}

async function writeCache(key: string, offers: FlightOffer[]): Promise<void> {
  const offersJson = JSON.stringify(offers);
  await prisma.searchCache
    .upsert({
      where: { key },
      create: { key, offersJson },
      update: { offersJson, createdAt: new Date() },
    })
    .catch(() => {});
}

/**
 * Default search path:
 *   1. Serve from SearchCache if a fresh (<15 min) entry exists.
 *   2. Try the `mock` provider (seeded routes). If it returns offers, cache + return.
 *   3. Fall back to `amadeus` when AMADEUS_CLIENT_ID is configured.
 *   4. Otherwise return [].
 *
 * If FLIGHT_PROVIDER is set to a single non-default provider, that provider is
 * used directly (still cached) instead of the chain.
 */
export async function searchWithChain(q: SearchQuery): Promise<{
  offers: FlightOffer[];
  source: string;
}> {
  const key = cacheKey(q);

  const cached = await readCache(key);
  if (cached) return { offers: cached, source: "cache" };

  const explicit = process.env.FLIGHT_PROVIDER;
  if (explicit && explicit !== "mock" && PROVIDERS[explicit]) {
    const offers = await PROVIDERS[explicit].searchOffers(q);
    if (offers.length > 0) await writeCache(key, offers);
    return { offers, source: explicit };
  }

  // Chain: mock first.
  const mockOffers = await mock.searchOffers(q);
  if (mockOffers.length > 0) {
    await writeCache(key, mockOffers);
    return { offers: mockOffers, source: "mock" };
  }

  // Fall back to Amadeus when credentials are present.
  if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
    try {
      const amadeusOffers = await amadeus.searchOffers(q);
      if (amadeusOffers.length > 0) {
        await writeCache(key, amadeusOffers);
        return { offers: amadeusOffers, source: "amadeus" };
      }
    } catch (err) {
      console.error("[searchWithChain] amadeus fallback failed:", err);
    }
  }

  return { offers: [], source: "none" };
}
