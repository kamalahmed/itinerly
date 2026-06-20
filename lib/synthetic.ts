/**
 * Any-pair synthetic flight generator. For an origin/destination not covered by
 * curated real data, this produces plausible (not real) flights so search works
 * worldwide: short/medium routes get direct flights flown by the two countries'
 * flag carriers; long routes get a connection via the most sensible global hub.
 * Distances come from airport coordinates, so durations are realistic.
 */
import { localIsoAt } from "@/lib/normalize";
import { resolveSchedule } from "@/lib/schedule";
import type {
  Airline,
  Airport,
  Cabin,
  FlightOffer,
  FlightSegment,
  SearchQuery,
} from "@/lib/types";

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

// Global connecting hubs and the carrier that plausibly operates them.
// Global connecting hubs by region with the carrier that operates each. The
// long-haul builder picks whichever genuinely sits "on the way" (smallest
// detour) so a connection routes through a plausible hub, not a random one.
const HUBS: { iata: string; carrier: string }[] = [
  // Middle East
  { iata: "DXB", carrier: "EK" },
  { iata: "DOH", carrier: "QR" },
  { iata: "AUH", carrier: "EY" },
  { iata: "IST", carrier: "TK" },
  { iata: "JED", carrier: "SV" },
  // South / Southeast Asia
  { iata: "DEL", carrier: "AI" },
  { iata: "SIN", carrier: "SQ" },
  { iata: "BKK", carrier: "TG" },
  { iata: "KUL", carrier: "MH" },
  // East Asia
  { iata: "HKG", carrier: "CX" },
  { iata: "ICN", carrier: "KE" },
  { iata: "NRT", carrier: "NH" },
  { iata: "PVG", carrier: "MU" },
  // Europe
  { iata: "FRA", carrier: "LH" },
  { iata: "LHR", carrier: "BA" },
  { iata: "CDG", carrier: "AF" },
  { iata: "AMS", carrier: "KL" },
  // Americas
  { iata: "JFK", carrier: "AA" },
  { iata: "ORD", carrier: "UA" },
  { iata: "ATL", carrier: "DL" },
  { iata: "YYZ", carrier: "AC" },
  { iata: "GRU", carrier: "LA" },
  // Africa / Oceania
  { iata: "ADD", carrier: "ET" },
  { iata: "JNB", carrier: "SA" },
  { iata: "SYD", carrier: "QF" },
];

const DEPARTURE_SLOTS = [
  "00:45", "02:30", "06:15", "08:10", "09:55", "11:20",
  "13:40", "15:05", "17:30", "19:10", "21:45", "23:30",
];

const LONGHAUL_BLOCK = 660; // minutes; beyond this we route via a hub

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

/** Great-circle distance in km. Returns 0 if either airport lacks coordinates. */
export function haversineKm(a: Airport, b: Airport): number {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) return 0;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Block time in minutes for a leg of `km`: ~820 km/h cruise + 30 min on ground. */
export function estimateBlockMinutes(km: number): number {
  return Math.max(45, Math.round((km / 820) * 60) + 30);
}

function aircraftForDistance(km: number, salt: number): string {
  if (km < 1500) {
    return ["Airbus A320neo", "Boeing 737-800", "Airbus A321neo"][salt % 3];
  }
  if (km < 4500) {
    return ["Boeing 737 MAX 8", "Airbus A321neo", "Airbus A330-300"][salt % 3];
  }
  return ["Boeing 787-9", "Airbus A350-900", "Boeing 777-300ER"][salt % 3];
}

export function priceForKm(km: number, carrier: string): number {
  const base = 60 + km * 0.052; // rough economy fare curve
  const premium = ["EK", "QR", "SQ", "CX", "QF", "NH", "JL"].includes(carrier)
    ? 1.12
    : 1.0;
  return Math.round(base * premium);
}

function flightNumber(carrier: string, salt: number): string {
  return `${carrier} ${100 + (salt % 899)}`;
}

function flagCarrier(
  countryCode: string,
  airlines: Airline[]
): Airline | undefined {
  return airlines.find((a) => a.countryCode === countryCode);
}

function paxUnits(q: SearchQuery): number {
  return q.adults + q.children + q.infants * 0.1;
}

function makeSegment(
  carrier: Airline,
  from: Airport,
  to: Airport,
  depDate: string,
  depTime: string,
  km: number,
  cabin: Cabin,
  salt: number
): { segment: FlightSegment; arrTime: string; arrDate: string } {
  const block = estimateBlockMinutes(km);
  const s = resolveSchedule(depTime, null, from.timeZone, to.timeZone, block);
  const arrDate =
    s.arrivalDayOffset === 0 ? depDate : addDays(depDate, s.arrivalDayOffset);
  return {
    segment: {
      carrier,
      flightNumber: flightNumber(carrier.iata, salt),
      origin: from,
      destination: to,
      departureLocal: localIsoAt(depDate, depTime),
      arrivalLocal: localIsoAt(arrDate, s.arrivalTimeLocal),
      durationMinutes: block,
      aircraft: aircraftForDistance(km, salt),
      cabin,
      baggage: CABIN_BAGGAGE[cabin],
    },
    arrTime: s.arrivalTimeLocal,
    arrDate,
  };
}

function addDays(date: string, days: number): string {
  if (days === 0) return date;
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function priceOffer(perPaxUSD: number, q: SearchQuery, legs: number) {
  const total = Math.round(
    perPaxUSD * CABIN_MULTIPLIER[q.cabin] * legs * paxUnits(q)
  );
  return { total, base: Math.round(total * 0.8), taxes: total - Math.round(total * 0.8) };
}

/** One-way plausible offers for any origin/destination pair. */
function buildOneWayOffers(
  origin: Airport,
  dest: Airport,
  airports: Airport[],
  airlines: Airline[],
  q: SearchQuery
): FlightOffer[] {
  if (origin.lat == null || dest.lat == null) return [];
  const km = haversineKm(origin, dest);
  if (km < 50) return [];

  const offers: FlightOffer[] = [];
  const block = estimateBlockMinutes(km);

  if (block <= LONGHAUL_BLOCK) {
    // Direct flights by the origin/destination flag carriers (deduped).
    const carriers = [
      flagCarrier(origin.countryCode, airlines),
      flagCarrier(dest.countryCode, airlines),
    ].filter((a): a is Airline => !!a);
    const unique = [...new Map(carriers.map((a) => [a.iata, a])).values()];
    if (unique.length === 0 && airlines.length) {
      unique.push(airlines[hash(origin.iata + dest.iata) % airlines.length]);
    }

    unique.forEach((carrier, i) => {
      const salt = hash(`${origin.iata}-${dest.iata}-${carrier.iata}`);
      const dep = DEPARTURE_SLOTS[(salt + i * 3) % DEPARTURE_SLOTS.length];
      const { segment } = makeSegment(carrier, origin, dest, q.departDate, dep, km, q.cabin, salt);
      const price = priceOffer(priceForKm(km, carrier.iata), q, 1);
      offers.push({
        id: `mock-syn-${origin.iata}-${dest.iata}-${carrier.iata}`,
        provider: "mock",
        totalPriceUSD: price.total,
        baseFareUSD: price.base,
        taxesUSD: price.taxes,
        totalDurationMinutes: segment.durationMinutes,
        stops: 0,
        outboundSegments: [segment],
        refundable: false,
      });
    });
  } else {
    // Long-haul: connect via a hub that genuinely sits on the way. Rank by the
    // path distance origin→hub→dest and keep only hubs whose detour is modest
    // (≤ 1.45× the direct distance); fall back to the single best if none pass.
    const byIata = new Map(airports.map((a) => [a.iata, a]));
    const ranked = HUBS.map((h) => ({ ...h, airport: byIata.get(h.iata) }))
      .filter(
        (h): h is typeof h & { airport: Airport } =>
          !!h.airport && h.iata !== origin.iata && h.iata !== dest.iata
      )
      .map((h) => {
        const detour =
          haversineKm(origin, h.airport) + haversineKm(h.airport, dest);
        return { ...h, detour, ratio: km ? detour / km : 1 };
      })
      .sort((a, b) => a.detour - b.detour);
    const sensible = ranked.filter((h) => h.ratio <= 1.45);
    const hubs = (sensible.length ? sensible : ranked).slice(0, 2);

    for (const h of hubs) {
      const carrier = airlines.find((a) => a.iata === h.carrier);
      if (!carrier || !h.airport) continue;
      const hub = h.airport;
      const km1 = haversineKm(origin, hub);
      const km2 = haversineKm(hub, dest);
      const salt = hash(`${origin.iata}-${dest.iata}-${h.iata}`);
      const dep = DEPARTURE_SLOTS[salt % DEPARTURE_SLOTS.length];

      const leg1 = makeSegment(carrier, origin, hub, q.departDate, dep, km1, q.cabin, salt);
      // Realistic hub connection: 90–210 min, deterministic per route+hub.
      const layover = 90 + (salt % 121);
      let dep2Min = toMinutes(leg1.arrTime) + layover;
      let leg2Date = leg1.arrDate;
      if (dep2Min >= 1440) {
        dep2Min -= 1440;
        leg2Date = addDays(leg1.arrDate, 1);
      }
      const leg2 = makeSegment(
        carrier,
        hub,
        dest,
        leg2Date,
        fmtMin(dep2Min),
        km2,
        q.cabin,
        salt + 1
      );

      const totalDur = leg1.segment.durationMinutes + layover + leg2.segment.durationMinutes;
      const price = priceOffer(priceForKm(km, h.carrier), q, 1);
      offers.push({
        id: `mock-syn-${origin.iata}-${dest.iata}-${h.iata}`,
        provider: "mock",
        totalPriceUSD: price.total,
        baseFareUSD: price.base,
        taxesUSD: price.taxes,
        totalDurationMinutes: totalDur,
        stops: 1,
        outboundSegments: [leg1.segment, leg2.segment],
        refundable: false,
      });
    }
  }

  return offers.sort((a, b) => a.totalPriceUSD - b.totalPriceUSD);
}

/** Plausible offers for any pair; pairs outbound with a reverse return leg for
 *  round trips (matched by carrier for directs, by hub for connections). */
export function synthesizeOffers(
  origin: Airport,
  dest: Airport,
  airports: Airport[],
  airlines: Airline[],
  q: SearchQuery
): FlightOffer[] {
  const outbound = buildOneWayOffers(origin, dest, airports, airlines, q);
  if (q.tripType !== "round_trip" || !q.returnDate) return outbound;

  const retQ: SearchQuery = {
    ...q,
    departDate: q.returnDate,
    tripType: "one_way",
  };
  const ret = buildOneWayOffers(dest, origin, airports, airlines, retQ);
  const suffix = (o: FlightOffer) => o.id.split("-").pop();

  return outbound.map((o) => {
    const match = ret.find((r) => suffix(r) === suffix(o));
    if (!match) return o;
    const total = Math.round((o.totalPriceUSD + match.totalPriceUSD) * 0.95);
    return {
      ...o,
      totalPriceUSD: total,
      baseFareUSD: Math.round(total * 0.8),
      taxesUSD: total - Math.round(total * 0.8),
      totalDurationMinutes: o.totalDurationMinutes + match.totalDurationMinutes,
      returnSegments: match.outboundSegments,
    };
  });
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function fmtMin(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(
    m % 60
  ).padStart(2, "0")}`;
}
