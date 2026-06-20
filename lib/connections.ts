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
  Airline,
  Airport,
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

function fmtMin(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(
    m % 60
  ).padStart(2, "0")}`;
}

/** "EK 201" → "EK 202" (return legs get a +1 number, like the direct round-trip). */
function bumpNumber(flightNumber: string): string {
  const m = flightNumber.match(/^([A-Z0-9]{2})\s*(\d+)$/);
  if (!m) return flightNumber;
  return `${m[1]} ${Number(m[2]) + 1}`;
}

interface LegInput {
  flightNumber: string;
  from: Airport;
  to: Airport;
  aircraft: string;
  depart?: string; // real legs: explicit local clock at `from`
  arrive?: string | null; // real legs: local clock at `to`
  layoverAfterPrev?: number; // synthesized legs: minutes after previous arrival
  nominalBlock?: number; // used to derive arrival when `arrive` is null
}

/** Assemble ordered legs into dated segments, threading multi-day arrivals and
 *  layovers through timezones. Returns the segments and the total hub layover. */
function buildSegments(
  carrier: Airline,
  legs: LegInput[],
  startDate: string,
  cabin: Cabin
): { segments: FlightSegment[]; layover: number } {
  const segments: FlightSegment[] = [];
  let layoverTotal = 0;
  let prevArrMin: number | null = null;
  let prevArrDate = startDate;

  legs.forEach((leg, i) => {
    let depClock: string;
    let depDate: string;
    if (i === 0) {
      depClock = leg.depart!;
      depDate = startDate;
    } else if (leg.depart) {
      // Real onward leg: layover is the gap to its scheduled departure.
      depClock = leg.depart;
      let lay = toMin(leg.depart) - prevArrMin!;
      depDate = prevArrDate;
      if (lay < 0) {
        lay += 1440;
        depDate = addDays(prevArrDate, 1);
      }
      layoverTotal += lay;
    } else {
      // Synthesized onward leg: depart = previous arrival + a chosen layover.
      const lay = leg.layoverAfterPrev!;
      layoverTotal += lay;
      let depMin = prevArrMin! + lay;
      depDate = prevArrDate;
      if (depMin >= 1440) {
        depMin -= 1440;
        depDate = addDays(prevArrDate, 1);
      }
      depClock = fmtMin(depMin);
    }

    const sched = resolveSchedule(
      depClock,
      leg.arrive ?? null,
      leg.from.timeZone,
      leg.to.timeZone,
      leg.nominalBlock ?? 0,
      leg.arrive ? 9999 : 0
    );
    const arrDate = addDays(depDate, sched.arrivalDayOffset);

    segments.push({
      carrier,
      flightNumber: leg.flightNumber,
      origin: leg.from,
      destination: leg.to,
      departureLocal: localIsoAt(depDate, depClock),
      arrivalLocal: localIsoAt(arrDate, sched.arrivalTimeLocal),
      durationMinutes: sched.durationMinutes,
      aircraft: leg.aircraft,
      cabin,
      baggage: CABIN_BAGGAGE[cabin],
    });
    prevArrMin = toMin(sched.arrivalTimeLocal);
    prevArrDate = arrDate;
  });

  return { segments, layover: layoverTotal };
}

async function buildConnectingOffer(
  c: ConnectingItinerary,
  q: SearchQuery
): Promise<FlightOffer | null> {
  const [carrier, origin, hub, dest] = await Promise.all([
    getAirline(c.carrier),
    getAirport(c.leg1.from),
    getAirport(c.hub),
    getAirport(c.dest),
  ]);
  if (!carrier || !origin || !hub || !dest) return null;

  // Outbound: the two real legs DAC → hub → destination.
  const out = buildSegments(
    carrier,
    [
      { flightNumber: c.leg1.flightNumber, from: origin, to: hub, aircraft: c.leg1.aircraft, depart: c.leg1.depart, arrive: c.leg1.arrive },
      { flightNumber: c.leg2.flightNumber, from: hub, to: dest, aircraft: c.leg2.aircraft, depart: c.leg2.depart, arrive: c.leg2.arrive },
    ],
    q.departDate,
    q.cabin
  );
  const block1 = out.segments[0].durationMinutes; // DAC ↔ hub
  const block2 = out.segments[1].durationMinutes; // hub ↔ dest

  let returnSegments: FlightSegment[] | undefined;
  let returnDuration = 0;
  if (q.tripType === "round_trip" && q.returnDate) {
    // Mirror the outbound with a plausible synthesized return (dest → hub →
    // DAC), the same convention the direct round-trip uses: reversed legs,
    // +1 flight numbers, a deterministic departure slot and ~2.5h layover.
    const retDepSlot = fmtMin(toMin(c.leg2.arrive ?? c.leg1.depart) + 120);
    const ret = buildSegments(
      carrier,
      [
        { flightNumber: bumpNumber(c.leg2.flightNumber), from: dest, to: hub, aircraft: c.leg2.aircraft, depart: retDepSlot, arrive: null, nominalBlock: block2 },
        { flightNumber: bumpNumber(c.leg1.flightNumber), from: hub, to: origin, aircraft: c.leg1.aircraft, layoverAfterPrev: 150, arrive: null, nominalBlock: block1 },
      ],
      q.returnDate,
      q.cabin
    );
    returnSegments = ret.segments;
    returnDuration =
      ret.segments[0].durationMinutes + ret.layover + ret.segments[1].durationMinutes;
  }

  const totalOut = block1 + out.layover + block2;
  const mult = CABIN_MULTIPLIER[q.cabin];
  const legs = returnSegments ? 1.9 : 1; // round trip ≈ 1.9× one-way
  const total = Math.round(c.basePriceUSD * mult * legs * paxUnits(q));
  const base = Math.round(total * 0.8);

  return {
    id: `mock-conn-${c.carrier}-${c.dest}`,
    provider: "mock",
    totalPriceUSD: total,
    baseFareUSD: base,
    taxesUSD: total - base,
    totalDurationMinutes: totalOut + returnDuration,
    stops: 1,
    outboundSegments: out.segments,
    returnSegments,
    refundable: false,
  };
}

/** Connecting offers for a DAC→destination search (one-way or round-trip). */
export async function connectingOffers(q: SearchQuery): Promise<FlightOffer[]> {
  if (q.origin !== "DAC") return [];
  const matches = REAL_CONNECTIONS.filter((c) => c.dest === q.destination);
  const built = await Promise.all(matches.map((c) => buildConnectingOffer(c, q)));
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

