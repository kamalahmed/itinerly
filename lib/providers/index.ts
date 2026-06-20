import { createHash } from "crypto";
import prisma from "@/lib/db";
import type { FlightOffer, FlightProvider, SearchQuery } from "@/lib/types";
import { withTimeout, DB_TIMEOUT_MS } from "@/lib/with-timeout";
import { mock } from "./mock";
import { amadeus } from "./amadeus";
import { duffel } from "./duffel";
import { aviationstack, isAviationstackEnabled } from "./aviationstack";

export type { FlightProvider } from "@/lib/types";

const PROVIDERS: Record<string, FlightProvider> = {
  mock,
  amadeus,
  duffel,
  aviationstack,
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
export function searchWithChain(q: SearchQuery): Promise<{
  offers: FlightOffer[];
  source: string;
}> {
  // Race the whole DB-backed chain against a timeout so an unreachable
  // database rejects quickly instead of hanging the request.
  return withTimeout(runSearchChain(q), DB_TIMEOUT_MS, "flight search");
}

async function runSearchChain(q: SearchQuery): Promise<{
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

  // Chain: real AviationStack schedules first (when a key is configured), so
  // routes it covers show real flight numbers/times; fall back to mock for
  // everything else. Any error (quota, network) degrades to mock.
  if (isAviationstackEnabled()) {
    try {
      const avOffers = await aviationstack.searchOffers(q);
      if (avOffers.length > 0) {
        await writeCache(key, avOffers);
        return { offers: avOffers, source: "aviationstack" };
      }
    } catch (err) {
      console.error("[searchWithChain] aviationstack failed:", err);
    }
  }

  // Curated real routes + connections + worldwide synthetic coverage.
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
