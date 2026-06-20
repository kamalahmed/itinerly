/**
 * Curated REAL connecting itineraries for long-haul routes that no carrier
 * flies nonstop from Dhaka. Each is a two-leg, single-carrier connection via
 * the airline's hub (e.g. Emirates DAC→DXB→LHR), with real flight numbers and
 * times on both legs. The builder assembles a 2-segment FlightOffer, resolving
 * each leg's timezone-correct times and the hub layover.
 */
import { getAirport, getAirline } from "@/lib/airports";
import { resolveSchedule } from "@/lib/schedule";
import { localIsoAt } from "@/lib/normalize";
import type {
  Cabin,
  FlightOffer,
  FlightSegment,
  SearchQuery,
} from "@/lib/types";

export interface ConnLeg {
  flightNumber: string;
  from: string;
  to: string;
  depart: string; // "HH:MM" local at `from`
  arrive: string; // "HH:MM" local at `to`
  aircraft: string;
}

export interface ConnectingItinerary {
  dest: string;
  carrier: string;
  hub: string;
  basePriceUSD: number; // economy base fare for the whole itinerary
  leg1: ConnLeg; // DAC → hub
  leg2: ConnLeg; // hub → dest
}

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

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
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

/** Build a 2-segment connecting offer for a one-way DAC departure on `departDate`. */
async function buildConnectingOffer(
  c: ConnectingItinerary,
  departDate: string,
  q: SearchQuery
): Promise<FlightOffer | null> {
  const [carrier, origin, hub, dest] = await Promise.all([
    getAirline(c.carrier),
    getAirport(c.leg1.from),
    getAirport(c.hub),
    getAirport(c.dest),
  ]);
  if (!carrier || !origin || !hub || !dest) return null;

  // Leg 1: DAC → hub. Trust the researched times (tolerance is wide for
  // curated connections) and resolve a tz-correct arrival + day offset.
  const s1 = resolveSchedule(
    c.leg1.depart,
    c.leg1.arrive,
    origin.timeZone,
    hub.timeZone,
    0,
    9999
  );
  const leg1ArrDate = addDays(departDate, s1.arrivalDayOffset);

  // Hub layover: leg 2's departure vs leg 1's arrival (both hub-local). A
  // negative gap means leg 2 leaves the next day.
  let layover = toMin(c.leg2.depart) - toMin(s1.arrivalTimeLocal);
  let leg2DepDate = leg1ArrDate;
  if (layover < 0) {
    layover += 1440;
    leg2DepDate = addDays(leg1ArrDate, 1);
  }

  // Leg 2: hub → destination.
  const s2 = resolveSchedule(
    c.leg2.depart,
    c.leg2.arrive,
    hub.timeZone,
    dest.timeZone,
    0,
    9999
  );
  const leg2ArrDate = addDays(leg2DepDate, s2.arrivalDayOffset);

  const seg1: FlightSegment = {
    carrier,
    flightNumber: c.leg1.flightNumber,
    origin,
    destination: hub,
    departureLocal: localIsoAt(departDate, c.leg1.depart),
    arrivalLocal: localIsoAt(leg1ArrDate, s1.arrivalTimeLocal),
    durationMinutes: s1.durationMinutes,
    aircraft: c.leg1.aircraft,
    cabin: q.cabin,
    baggage: CABIN_BAGGAGE[q.cabin],
  };
  const seg2: FlightSegment = {
    carrier,
    flightNumber: c.leg2.flightNumber,
    origin: hub,
    destination: dest,
    departureLocal: localIsoAt(leg2DepDate, c.leg2.depart),
    arrivalLocal: localIsoAt(leg2ArrDate, s2.arrivalTimeLocal),
    durationMinutes: s2.durationMinutes,
    aircraft: c.leg2.aircraft,
    cabin: q.cabin,
    baggage: CABIN_BAGGAGE[q.cabin],
  };

  const totalDurationMinutes = s1.durationMinutes + layover + s2.durationMinutes;

  const mult = CABIN_MULTIPLIER[q.cabin];
  const total = Math.round(c.basePriceUSD * mult * paxUnits(q));
  const base = Math.round(total * 0.8);

  return {
    id: `mock-conn-${c.carrier}-${c.dest}`,
    provider: "mock",
    totalPriceUSD: total,
    baseFareUSD: base,
    taxesUSD: total - base,
    totalDurationMinutes,
    stops: 1,
    outboundSegments: [seg1, seg2],
    refundable: false,
  };
}

/** Connecting offers for a one-way DAC→destination search (empty otherwise). */
export async function connectingOffers(q: SearchQuery): Promise<FlightOffer[]> {
  if (q.origin !== "DAC" || q.tripType === "round_trip") return [];
  const matches = REAL_CONNECTIONS.filter((c) => c.dest === q.destination);
  const built = await Promise.all(
    matches.map((c) => buildConnectingOffer(c, q.departDate, q))
  );
  return built.filter((o): o is FlightOffer => o !== null);
}

// Researched real connecting itineraries (mid-2026), single-carrier via hub.
export const REAL_CONNECTIONS: ConnectingItinerary[] = [
  // Emirates via Dubai (DXB)
  { dest: "LHR", carrier: "EK", hub: "DXB", basePriceUSD: 620,
    leg1: { flightNumber: "EK 585", from: "DAC", to: "DXB", depart: "01:40", arrive: "04:30", aircraft: "Boeing 777-300ER" },
    leg2: { flightNumber: "EK 001", from: "DXB", to: "LHR", depart: "07:35", arrive: "12:25", aircraft: "Airbus A380-800" } },
  { dest: "CDG", carrier: "EK", hub: "DXB", basePriceUSD: 640,
    leg1: { flightNumber: "EK 585", from: "DAC", to: "DXB", depart: "01:40", arrive: "04:30", aircraft: "Boeing 777-300ER" },
    leg2: { flightNumber: "EK 073", from: "DXB", to: "CDG", depart: "10:19", arrive: "16:15", aircraft: "Airbus A380-800" } },
  { dest: "FRA", carrier: "EK", hub: "DXB", basePriceUSD: 650,
    leg1: { flightNumber: "EK 585", from: "DAC", to: "DXB", depart: "01:40", arrive: "04:30", aircraft: "Boeing 777-300ER" },
    leg2: { flightNumber: "EK 045", from: "DXB", to: "FRA", depart: "07:10", arrive: "13:15", aircraft: "Airbus A380-800" } },
  { dest: "AMS", carrier: "EK", hub: "DXB", basePriceUSD: 645,
    leg1: { flightNumber: "EK 585", from: "DAC", to: "DXB", depart: "01:40", arrive: "04:30", aircraft: "Boeing 777-300ER" },
    leg2: { flightNumber: "EK 147", from: "DXB", to: "AMS", depart: "07:50", arrive: "13:15", aircraft: "Airbus A380-800" } },
  { dest: "JFK", carrier: "EK", hub: "DXB", basePriceUSD: 980,
    leg1: { flightNumber: "EK 585", from: "DAC", to: "DXB", depart: "01:40", arrive: "04:30", aircraft: "Boeing 777-300ER" },
    leg2: { flightNumber: "EK 201", from: "DXB", to: "JFK", depart: "07:50", arrive: "14:25", aircraft: "Airbus A380-800" } },
  { dest: "IAD", carrier: "EK", hub: "DXB", basePriceUSD: 960,
    leg1: { flightNumber: "EK 587", from: "DAC", to: "DXB", depart: "19:30", arrive: "22:30", aircraft: "Boeing 777-300ER" },
    leg2: { flightNumber: "EK 231", from: "DXB", to: "IAD", depart: "01:40", arrive: "08:40", aircraft: "Boeing 777-300ER" } },
  { dest: "ORD", carrier: "EK", hub: "DXB", basePriceUSD: 1010,
    leg1: { flightNumber: "EK 585", from: "DAC", to: "DXB", depart: "01:40", arrive: "04:30", aircraft: "Boeing 777-300ER" },
    leg2: { flightNumber: "EK 235", from: "DXB", to: "ORD", depart: "09:35", arrive: "15:15", aircraft: "Boeing 777-300ER" } },
  { dest: "LAX", carrier: "EK", hub: "DXB", basePriceUSD: 1080,
    leg1: { flightNumber: "EK 585", from: "DAC", to: "DXB", depart: "01:40", arrive: "04:30", aircraft: "Boeing 777-300ER" },
    leg2: { flightNumber: "EK 215", from: "DXB", to: "LAX", depart: "08:10", arrive: "14:15", aircraft: "Airbus A380-800" } },
  { dest: "YYZ", carrier: "EK", hub: "DXB", basePriceUSD: 940,
    leg1: { flightNumber: "EK 587", from: "DAC", to: "DXB", depart: "19:30", arrive: "22:30", aircraft: "Boeing 777-300ER" },
    leg2: { flightNumber: "EK 241", from: "DXB", to: "YYZ", depart: "03:30", arrive: "09:30", aircraft: "Boeing 777-300ER" } },

  // Qatar Airways via Doha (DOH)
  { dest: "LHR", carrier: "QR", hub: "DOH", basePriceUSD: 620,
    leg1: { flightNumber: "QR 641", from: "DAC", to: "DOH", depart: "10:55", arrive: "13:20", aircraft: "Boeing 777-300ER" },
    leg2: { flightNumber: "QR 015", from: "DOH", to: "LHR", depart: "15:31", arrive: "20:22", aircraft: "Airbus A350-1000" } },
  { dest: "MAN", carrier: "QR", hub: "DOH", basePriceUSD: 610,
    leg1: { flightNumber: "QR 639", from: "DAC", to: "DOH", depart: "19:15", arrive: "22:20", aircraft: "Boeing 777-300ER" },
    leg2: { flightNumber: "QR 021", from: "DOH", to: "MAN", depart: "02:20", arrive: "07:22", aircraft: "Boeing 777-300ER" } },
  { dest: "FRA", carrier: "QR", hub: "DOH", basePriceUSD: 650,
    leg1: { flightNumber: "QR 639", from: "DAC", to: "DOH", depart: "19:15", arrive: "22:20", aircraft: "Boeing 777-300ER" },
    leg2: { flightNumber: "QR 069", from: "DOH", to: "FRA", depart: "01:45", arrive: "07:15", aircraft: "Boeing 777-300ER" } },
  { dest: "FCO", carrier: "QR", hub: "DOH", basePriceUSD: 620,
    leg1: { flightNumber: "QR 639", from: "DAC", to: "DOH", depart: "19:15", arrive: "22:20", aircraft: "Boeing 777-300ER" },
    leg2: { flightNumber: "QR 115", from: "DOH", to: "FCO", depart: "02:50", arrive: "08:30", aircraft: "Airbus A350-900" } },
  { dest: "MAD", carrier: "QR", hub: "DOH", basePriceUSD: 660,
    leg1: { flightNumber: "QR 643", from: "DAC", to: "DOH", depart: "04:00", arrive: "06:25", aircraft: "Boeing 787-8" },
    leg2: { flightNumber: "QR 149", from: "DOH", to: "MAD", depart: "08:30", arrive: "15:30", aircraft: "Boeing 777-300ER" } },
  { dest: "JFK", carrier: "QR", hub: "DOH", basePriceUSD: 980,
    leg1: { flightNumber: "QR 643", from: "DAC", to: "DOH", depart: "04:00", arrive: "06:25", aircraft: "Boeing 787-8" },
    leg2: { flightNumber: "QR 701", from: "DOH", to: "JFK", depart: "08:30", arrive: "15:50", aircraft: "Boeing 777-300ER" } },
  { dest: "ORD", carrier: "QR", hub: "DOH", basePriceUSD: 1010,
    leg1: { flightNumber: "QR 643", from: "DAC", to: "DOH", depart: "04:00", arrive: "06:25", aircraft: "Boeing 787-8" },
    leg2: { flightNumber: "QR 725", from: "DOH", to: "ORD", depart: "09:40", arrive: "16:50", aircraft: "Boeing 777-300ER" } },
  { dest: "LAX", carrier: "QR", hub: "DOH", basePriceUSD: 1080,
    leg1: { flightNumber: "QR 643", from: "DAC", to: "DOH", depart: "04:00", arrive: "06:25", aircraft: "Boeing 787-8" },
    leg2: { flightNumber: "QR 739", from: "DOH", to: "LAX", depart: "07:40", arrive: "13:50", aircraft: "Airbus A350-1000" } },
  { dest: "YYZ", carrier: "QR", hub: "DOH", basePriceUSD: 940,
    leg1: { flightNumber: "QR 643", from: "DAC", to: "DOH", depart: "04:00", arrive: "06:25", aircraft: "Boeing 787-8" },
    leg2: { flightNumber: "QR 767", from: "DOH", to: "YYZ", depart: "08:10", arrive: "14:15", aircraft: "Boeing 777-300ER" } },

  // Turkish Airlines via Istanbul (IST) — leg 1 is the real DAC-IST nonstop TK713.
  { dest: "LHR", carrier: "TK", hub: "IST", basePriceUSD: 600,
    leg1: { flightNumber: "TK 713", from: "DAC", to: "IST", depart: "06:50", arrive: "12:45", aircraft: "Airbus A330-300" },
    leg2: { flightNumber: "TK 1971", from: "IST", to: "LHR", depart: "15:00", arrive: "16:10", aircraft: "Airbus A350-900" } },
  { dest: "CDG", carrier: "TK", hub: "IST", basePriceUSD: 630,
    leg1: { flightNumber: "TK 713", from: "DAC", to: "IST", depart: "06:50", arrive: "12:45", aircraft: "Airbus A330-300" },
    leg2: { flightNumber: "TK 1827", from: "IST", to: "CDG", depart: "15:30", arrive: "18:05", aircraft: "Airbus A321" } },
  { dest: "FRA", carrier: "TK", hub: "IST", basePriceUSD: 640,
    leg1: { flightNumber: "TK 713", from: "DAC", to: "IST", depart: "06:50", arrive: "12:45", aircraft: "Airbus A330-300" },
    leg2: { flightNumber: "TK 1597", from: "IST", to: "FRA", depart: "19:00", arrive: "21:15", aircraft: "Airbus A321-200" } },
  { dest: "JFK", carrier: "TK", hub: "IST", basePriceUSD: 950,
    leg1: { flightNumber: "TK 713", from: "DAC", to: "IST", depart: "06:50", arrive: "12:45", aircraft: "Airbus A330-300" },
    leg2: { flightNumber: "TK 11", from: "IST", to: "JFK", depart: "18:45", arrive: "22:40", aircraft: "Boeing 777-300ER" } },
  { dest: "ORD", carrier: "TK", hub: "IST", basePriceUSD: 990,
    leg1: { flightNumber: "TK 713", from: "DAC", to: "IST", depart: "06:50", arrive: "12:45", aircraft: "Airbus A330-300" },
    leg2: { flightNumber: "TK 5", from: "IST", to: "ORD", depart: "14:45", arrive: "18:15", aircraft: "Boeing 787-9" } },

  // Etihad via Abu Dhabi (AUH)
  { dest: "LHR", carrier: "EY", hub: "AUH", basePriceUSD: 640,
    leg1: { flightNumber: "EY 1367", from: "DAC", to: "AUH", depart: "21:05", arrive: "00:45", aircraft: "Airbus A320" },
    leg2: { flightNumber: "EY 19", from: "AUH", to: "LHR", depart: "08:10", arrive: "12:45", aircraft: "Boeing 787-10" } },
  { dest: "JFK", carrier: "EY", hub: "AUH", basePriceUSD: 990,
    leg1: { flightNumber: "EY 1367", from: "DAC", to: "AUH", depart: "21:05", arrive: "00:45", aircraft: "Airbus A320" },
    leg2: { flightNumber: "EY 3", from: "AUH", to: "JFK", depart: "09:40", arrive: "15:08", aircraft: "Boeing 787-9" } },
];

