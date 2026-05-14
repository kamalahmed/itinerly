import { Duffel } from "@duffel/api";
import type {
  Cabin,
  FlightOffer,
  FlightProvider,
  FlightSegment,
  SearchQuery,
} from "@/lib/types";

/**
 * Duffel provider — real airline content via the Duffel API.
 * Requires DUFFEL_API_KEY. Note: Duffel test offers are often priced in GBP;
 * amounts are passed through as-is (FX normalization is out of MVP scope).
 */

function client(): Duffel {
  const token = process.env.DUFFEL_API_KEY;
  if (!token) throw new Error("DUFFEL_API_KEY is not set");
  return new Duffel({ token });
}

/** "PT5H40M" → 340 */
function parseIsoDuration(iso?: string | null): number {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSegment(seg: any, fallbackCabin: Cabin): FlightSegment {
  const cabin: Cabin =
    (seg.passengers?.[0]?.cabin_class as Cabin) ?? fallbackCabin;
  return {
    carrier: {
      iata: seg.marketing_carrier?.iata_code ?? "",
      name: seg.marketing_carrier?.name ?? "",
      logo:
        seg.marketing_carrier?.logo_symbol_url ??
        `/airlines/${seg.marketing_carrier?.iata_code}.svg`,
    },
    flightNumber: `${seg.marketing_carrier?.iata_code ?? ""} ${
      seg.marketing_carrier_flight_number ?? ""
    }`.trim(),
    origin: {
      iata: seg.origin?.iata_code ?? "",
      name: seg.origin?.name ?? seg.origin?.iata_code ?? "",
      city: seg.origin?.city_name ?? seg.origin?.iata_code ?? "",
      country: seg.origin?.iata_country_code ?? "",
      countryCode: seg.origin?.iata_country_code ?? "",
      timeZone: seg.origin?.time_zone ?? "UTC",
    },
    destination: {
      iata: seg.destination?.iata_code ?? "",
      name: seg.destination?.name ?? seg.destination?.iata_code ?? "",
      city: seg.destination?.city_name ?? seg.destination?.iata_code ?? "",
      country: seg.destination?.iata_country_code ?? "",
      countryCode: seg.destination?.iata_country_code ?? "",
      timeZone: seg.destination?.time_zone ?? "UTC",
    },
    departureLocal: seg.departing_at,
    arrivalLocal: seg.arriving_at,
    durationMinutes: parseIsoDuration(seg.duration),
    aircraft: seg.aircraft?.name,
    cabin,
  };
}

function normalizeDuffelOffer(offer: any, fallbackCabin: Cabin): FlightOffer {
  const outboundSlice = offer.slices?.[0];
  const returnSlice = offer.slices?.[1];

  const outboundSegments: FlightSegment[] = (
    outboundSlice?.segments ?? []
  ).map((s: any) => mapSegment(s, fallbackCabin));
  const returnSegments: FlightSegment[] | undefined = returnSlice
    ? returnSlice.segments.map((s: any) => mapSegment(s, fallbackCabin))
    : undefined;

  const total = Number(offer.total_amount ?? 0);
  const base = Number(offer.base_amount ?? 0);
  const taxes = Number(offer.tax_amount ?? Math.max(0, total - base));
  const totalDurationMinutes =
    parseIsoDuration(outboundSlice?.duration) +
    (returnSlice ? parseIsoDuration(returnSlice.duration) : 0);

  return {
    id: `duffel-${offer.id}`,
    provider: "duffel",
    totalPriceUSD: total,
    baseFareUSD: base,
    taxesUSD: taxes,
    totalDurationMinutes,
    stops: Math.max(0, outboundSegments.length - 1),
    outboundSegments,
    returnSegments,
    expiresAt: offer.expires_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const duffel: FlightProvider = {
  name: "duffel",

  async searchOffers(q: SearchQuery): Promise<FlightOffer[]> {
    const duffelClient = client();

    const slices =
      q.tripType === "round_trip" && q.returnDate
        ? [
            {
              origin: q.origin,
              destination: q.destination,
              departure_date: q.departDate,
            },
            {
              origin: q.destination,
              destination: q.origin,
              departure_date: q.returnDate,
            },
          ]
        : [
            {
              origin: q.origin,
              destination: q.destination,
              departure_date: q.departDate,
            },
          ];

    const passengers = [
      ...Array(q.adults).fill({ type: "adult" as const }),
      ...Array(q.children).fill({ type: "child" as const }),
      ...Array(q.infants).fill({ type: "infant_without_seat" as const }),
    ];

    const req = await duffelClient.offerRequests.create({
      slices,
      passengers,
      cabin_class: q.cabin,
      return_offers: true,
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    } as any);

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const offers: any[] = (req.data as any).offers ?? [];
    return offers
      .map((o) => normalizeDuffelOffer(o, q.cabin))
      .sort((a, b) => a.totalPriceUSD - b.totalPriceUSD);
  },
};
