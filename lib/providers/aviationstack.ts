/**
 * AviationStack provider — real flight schedules for a route via the real-time
 * `/flights` endpoint (works on the free tier; `flightsFuture` is rate-limited).
 * It returns the actual flights operating origin→destination with real flight
 * numbers, scheduled local times, and terminals. The schedule is date-agnostic
 * (airlines fly the same numbers daily), so we project it onto the search date.
 *
 * AviationStack has no fares → prices are synthesized from distance. The free
 * tier is tiny (HTTP-only, ~100 calls/month), so each route is cached for 12h
 * and any error/quota (HTTP 429) falls back to the curated+synthetic mock.
 */
import { createHash } from "crypto";
import prisma from "@/lib/db";
import { getAirport, getAirline } from "@/lib/airports";
import { resolveSchedule } from "@/lib/schedule";
import { localIsoAt } from "@/lib/normalize";
import { haversineKm, estimateBlockMinutes, priceForKm } from "@/lib/synthetic";
import type {
  Airline,
  Cabin,
  FlightOffer,
  FlightProvider,
  FlightSegment,
  SearchQuery,
} from "@/lib/types";

const RAW_TTL_MS = 12 * 60 * 60 * 1000;

const CABIN_MULTIPLIER: Record<Cabin, number> = {
  economy: 1.0,
  premium_economy: 1.6,
  business: 3.0,
  first: 5.0,
};
const CABIN_BAGGAGE: Record<Cabin, string> = {
  economy: "30kg",
  premium_economy: "35kg",
  business: "40kg",
  first: "50kg",
};

interface RawFlight {
  flight?: { number?: string; iata?: string; codeshared?: unknown };
  airline?: { name?: string; iata?: string };
  departure?: { iata?: string; scheduled?: string; terminal?: string };
  arrival?: { iata?: string; scheduled?: string; terminal?: string };
}

export function isAviationstackEnabled(): boolean {
  return !!process.env.AVIATIONSTACK_API_KEY;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function addDays(date: string, days: number): string {
  if (days === 0) return date;
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function paxUnits(q: SearchQuery): number {
  return q.adults + q.children + q.infants * 0.1;
}

/** "2026-06-20T22:55:00+00:00" → "22:55" (the local clock time, offset ignored). */
function clockOf(iso: string | undefined): string | null {
  if (!iso || iso.length < 16) return null;
  return iso.slice(11, 16);
}

async function fetchRoute(origin: string, dest: string): Promise<RawFlight[]> {
  const key = process.env.AVIATIONSTACK_API_KEY;
  if (!key) return [];
  const url =
    `http://api.aviationstack.com/v1/flights?access_key=${key}` +
    `&dep_iata=${origin}&arr_iata=${dest}&limit=100`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`aviationstack HTTP ${res.status}`);
  const json = (await res.json()) as { data?: RawFlight[]; error?: unknown };
  if (json.error) throw new Error(`aviationstack: ${JSON.stringify(json.error)}`);
  return json.data ?? [];
}

/** Unique flights on a route, cached 12h (one API call per route / 12h). */
async function cachedRoute(origin: string, dest: string): Promise<RawFlight[]> {
  const cacheKey = createHash("sha256")
    .update(`av|${origin}|${dest}`)
    .digest("hex");
  const row = await prisma.searchCache.findUnique({ where: { key: cacheKey } });
  let raw: RawFlight[] | null = null;
  if (row && Date.now() - row.createdAt.getTime() < RAW_TTL_MS) {
    try {
      raw = JSON.parse(row.offersJson) as RawFlight[];
    } catch {
      raw = null;
    }
  }
  if (!raw) {
    raw = await fetchRoute(origin, dest);
    await prisma.searchCache
      .upsert({
        where: { key: cacheKey },
        create: { key: cacheKey, offersJson: JSON.stringify(raw) },
        update: { offersJson: JSON.stringify(raw), createdAt: new Date() },
      })
      .catch(() => {});
  }
  // Keep only operating flights (drop codeshares) and dedupe by flight number
  // (the endpoint returns one row per operating day).
  const seen = new Set<string>();
  const unique: RawFlight[] = [];
  for (const f of raw) {
    const num = f.flight?.iata;
    if (!num || f.flight?.codeshared || seen.has(num)) continue;
    seen.add(num);
    unique.push(f);
  }
  return unique;
}

async function toSegment(
  rf: RawFlight,
  originIata: string,
  destIata: string,
  date: string,
  cabin: Cabin
): Promise<FlightSegment | null> {
  const dep = clockOf(rf.departure?.scheduled);
  const arr = clockOf(rf.arrival?.scheduled);
  const carrierIata = rf.airline?.iata?.toUpperCase();
  const number = rf.flight?.number;
  if (!dep || !arr || !carrierIata || !number) return null;

  const [origin, dest] = await Promise.all([
    getAirport(originIata),
    getAirport(destIata),
  ]);
  if (!origin || !dest) return null;

  const dbAirline = await getAirline(carrierIata);
  const carrier: Airline = dbAirline ?? {
    iata: carrierIata,
    name: titleCase(rf.airline?.name ?? carrierIata),
    logo: `/airlines/${carrierIata}.svg`,
  };

  const km = haversineKm(origin, dest);
  const nominal = km ? estimateBlockMinutes(km) : 120;
  const sched = resolveSchedule(dep, arr, origin.timeZone, dest.timeZone, nominal, 9999);

  return {
    carrier,
    flightNumber: `${carrierIata} ${number}`,
    origin,
    destination: dest,
    departureLocal: localIsoAt(date, dep),
    arrivalLocal: localIsoAt(addDays(date, sched.arrivalDayOffset), sched.arrivalTimeLocal),
    durationMinutes: sched.durationMinutes,
    originTerminal: rf.departure?.terminal || undefined,
    destinationTerminal: rf.arrival?.terminal || undefined,
    cabin,
    baggage: CABIN_BAGGAGE[cabin],
  };
}

export const aviationstack: FlightProvider = {
  name: "aviationstack",

  async searchOffers(q: SearchQuery): Promise<FlightOffer[]> {
    const outbound = await cachedRoute(q.origin, q.destination);
    if (outbound.length === 0) return [];

    const returnRaw =
      q.tripType === "round_trip" && q.returnDate
        ? await cachedRoute(q.destination, q.origin)
        : [];

    const offers: FlightOffer[] = [];
    for (const rf of outbound) {
      const outSeg = await toSegment(rf, q.origin, q.destination, q.departDate, q.cabin);
      if (!outSeg) continue;

      const km = haversineKm(outSeg.origin, outSeg.destination);
      const perPax = priceForKm(km, outSeg.carrier.iata);

      let returnSegments: FlightSegment[] | undefined;
      let legs = 1;
      if (q.tripType === "round_trip" && q.returnDate) {
        const back =
          returnRaw.find(
            (r) => r.airline?.iata?.toUpperCase() === outSeg.carrier.iata
          ) ?? returnRaw[0];
        const retSeg = back
          ? await toSegment(back, q.destination, q.origin, q.returnDate, q.cabin)
          : null;
        if (!retSeg) continue;
        returnSegments = [retSeg];
        legs = 1.9;
      }

      const total = Math.round(perPax * CABIN_MULTIPLIER[q.cabin] * legs * paxUnits(q));
      const base = Math.round(total * 0.8);
      offers.push({
        id: `av-${outSeg.flightNumber.replace(/\s/g, "")}`,
        provider: "aviationstack",
        totalPriceUSD: total,
        baseFareUSD: base,
        taxesUSD: total - base,
        totalDurationMinutes:
          outSeg.durationMinutes + (returnSegments?.[0]?.durationMinutes ?? 0),
        stops: 0,
        outboundSegments: [outSeg],
        returnSegments,
        refundable: false,
      });
    }

    return offers.sort((a, b) => a.totalPriceUSD - b.totalPriceUSD);
  },
};
