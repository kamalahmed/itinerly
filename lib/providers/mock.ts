import prisma from "@/lib/db";
import { getAirport, getAirline } from "@/lib/airports";
import { computeLocalTimes } from "@/lib/normalize";
import type {
  FlightOffer,
  FlightProvider,
  FlightSegment,
  SearchQuery,
  Cabin,
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

type SeededRouteRow = {
  id: number;
  originIata: string;
  destinationIata: string;
  airlineIata: string;
  flightNumber: string;
  departureTimeLocal: string;
  durationMinutes: number;
  aircraft: string | null;
  basePriceUSD: number;
};

/** Effective passenger count for pricing (infants priced at 10%). */
function paxUnits(q: SearchQuery): number {
  return q.adults + q.children + q.infants * 0.1;
}

/**
 * Build a flight segment from a seeded route. The seed table is outbound-only
 * (Bangladesh → destination), so the return leg of a round trip is synthesized
 * by reversing a forward route: origin/destination swap, a derived departure
 * slot, and a "+1" on the flight number.
 */
async function buildSegment(
  route: SeededRouteRow,
  departDate: string,
  cabin: Cabin,
  reverse = false
): Promise<FlightSegment | null> {
  const originIata = reverse ? route.destinationIata : route.originIata;
  const destinationIata = reverse ? route.originIata : route.destinationIata;
  const [carrier, origin, destination] = await Promise.all([
    getAirline(route.airlineIata),
    getAirport(originIata),
    getAirport(destinationIata),
  ]);
  if (!carrier || !origin || !destination) return null;

  // Reverse legs get a deterministic-but-different departure slot.
  const depTime = reverse
    ? shiftSlot(route.departureTimeLocal, route.id)
    : route.departureTimeLocal;

  const { departureLocal, arrivalLocal } = computeLocalTimes(
    departDate,
    depTime,
    route.durationMinutes
  );

  const baseNumber = route.flightNumber.replace(route.airlineIata, "").trim();
  const flightNumber = reverse
    ? `${route.airlineIata} ${Number(baseNumber) + 1}`
    : `${route.airlineIata} ${baseNumber}`;

  return {
    carrier,
    flightNumber,
    origin,
    destination,
    departureLocal,
    arrivalLocal,
    durationMinutes: route.durationMinutes,
    aircraft: route.aircraft ?? undefined,
    cabin,
    baggage: CABIN_BAGGAGE[cabin],
  };
}

/** Deterministically pick a different "HH:MM" slot for a synthesized return leg. */
function shiftSlot(time: string, salt: number): string {
  const [h, m] = time.split(":").map(Number);
  const shifted = (h * 60 + m + 7 * 60 + (salt % 5) * 90) % (24 * 60);
  return `${String(Math.floor(shifted / 60)).padStart(2, "0")}:${String(
    shifted % 60
  ).padStart(2, "0")}`;
}

function priceOffer(
  route: SeededRouteRow,
  q: SearchQuery,
  legs: number
): { total: number; base: number; taxes: number } {
  const mult = CABIN_MULTIPLIER[q.cabin];
  const perPax = route.basePriceUSD * mult * legs;
  const total = Math.round(perPax * paxUnits(q));
  const base = Math.round(total * 0.8);
  return { total, base, taxes: total - base };
}

export const mock: FlightProvider = {
  name: "mock",

  async searchOffers(q: SearchQuery): Promise<FlightOffer[]> {
    const outboundRoutes = (await prisma.seededRoute.findMany({
      where: { originIata: q.origin, destinationIata: q.destination },
    })) as SeededRouteRow[];

    if (outboundRoutes.length === 0) return [];

    const offers: FlightOffer[] = [];

    if (q.tripType === "round_trip" && q.returnDate) {
      // The seed table is outbound-only; the return leg is synthesized by
      // reversing a forward route of the same carrier.
      for (const out of outboundRoutes) {
        const ret =
          outboundRoutes.find(
            (r) => r.airlineIata === out.airlineIata && r.id !== out.id
          ) ?? out;

        const outSeg = await buildSegment(out, q.departDate, q.cabin);
        const retSeg = await buildSegment(ret, q.returnDate, q.cabin, true);
        if (!outSeg || !retSeg) continue;

        const outPrice = priceOffer(out, q, 1);
        const retPrice = priceOffer(ret, q, 1);
        offers.push({
          id: `mock-rt-${out.id}-${ret.id}`,
          provider: "mock",
          totalPriceUSD: outPrice.total + retPrice.total,
          baseFareUSD: outPrice.base + retPrice.base,
          taxesUSD: outPrice.taxes + retPrice.taxes,
          totalDurationMinutes:
            outSeg.durationMinutes + retSeg.durationMinutes,
          stops: 0,
          outboundSegments: [outSeg],
          returnSegments: [retSeg],
          refundable: false,
        });
      }
    } else {
      for (const out of outboundRoutes) {
        const seg = await buildSegment(out, q.departDate, q.cabin);
        if (!seg) continue;
        const price = priceOffer(out, q, 1);
        offers.push({
          id: `mock-ow-${out.id}`,
          provider: "mock",
          totalPriceUSD: price.total,
          baseFareUSD: price.base,
          taxesUSD: price.taxes,
          totalDurationMinutes: seg.durationMinutes,
          stops: 0,
          outboundSegments: [seg],
          refundable: false,
        });
      }
    }

    // Sort by price, but float the preferred airline (if any) to the top.
    const pref = q.preferredAirline?.toUpperCase();
    return offers.sort((a, b) => {
      if (pref) {
        const am = a.outboundSegments[0].carrier.iata === pref ? 0 : 1;
        const bm = b.outboundSegments[0].carrier.iata === pref ? 0 : 1;
        if (am !== bm) return am - bm;
      }
      return a.totalPriceUSD - b.totalPriceUSD;
    });
  },
};
