import { getAirport } from "@/lib/airports";
import type {
  Airline,
  Airport,
  Cabin,
  FlightOffer,
  FlightProvider,
  FlightSegment,
  SearchQuery,
} from "@/lib/types";

/**
 * Amadeus Self-Service Flight Offers Search provider.
 * Uses OAuth2 client-credentials. Defaults to the TEST host; set
 * AMADEUS_HOSTNAME=api.amadeus.com to flip to production.
 */

const HOSTNAME = process.env.AMADEUS_HOSTNAME ?? "test.api.amadeus.com";
const BASE = `https://${HOSTNAME}`;

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.value;
  }
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET are not set");
  }

  const res = await fetch(`${BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    throw new Error(`Amadeus auth failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    value: json.access_token,
    expiresAt: now + json.expires_in * 1000,
  };
  return cachedToken.value;
}

const CABIN_MAP: Record<Cabin, string> = {
  economy: "ECONOMY",
  premium_economy: "PREMIUM_ECONOMY",
  business: "BUSINESS",
  first: "FIRST",
};

/** "PT5H40M" → 340 */
function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return (Number(m[1] ?? 0) * 60) + Number(m[2] ?? 0);
}

function fallbackAirport(iata: string): Airport {
  return {
    iata,
    name: iata,
    city: iata,
    country: "",
    countryCode: "",
    timeZone: "UTC",
  };
}

async function resolveAirport(iata: string): Promise<Airport> {
  return (await getAirport(iata)) ?? fallbackAirport(iata);
}

interface AmadeusSegment {
  departure: { iataCode: string; terminal?: string; at: string };
  arrival: { iataCode: string; terminal?: string; at: string };
  carrierCode: string;
  number: string;
  aircraft?: { code: string };
  duration?: string;
}

interface AmadeusOffer {
  id: string;
  itineraries: { duration: string; segments: AmadeusSegment[] }[];
  price: { total: string; base: string; currency: string };
  travelerPricings?: {
    fareDetailsBySegment: { cabin: string }[];
  }[];
}

interface AmadeusResponse {
  data?: AmadeusOffer[];
  dictionaries?: {
    carriers?: Record<string, string>;
    aircraft?: Record<string, string>;
  };
}

async function buildSegments(
  segments: AmadeusSegment[],
  cabin: Cabin,
  carriers: Record<string, string>,
  aircraftDict: Record<string, string>
): Promise<FlightSegment[]> {
  return Promise.all(
    segments.map(async (s) => {
      const [origin, destination] = await Promise.all([
        resolveAirport(s.departure.iataCode),
        resolveAirport(s.arrival.iataCode),
      ]);
      const carrier: Airline = {
        iata: s.carrierCode,
        name: carriers[s.carrierCode] ?? s.carrierCode,
        logo: `/airlines/${s.carrierCode}.svg`,
      };
      return {
        carrier,
        flightNumber: `${s.carrierCode} ${s.number}`,
        origin,
        destination,
        departureLocal: s.departure.at,
        arrivalLocal: s.arrival.at,
        durationMinutes: s.duration
          ? parseIsoDuration(s.duration)
          : 0,
        aircraft: s.aircraft
          ? aircraftDict[s.aircraft.code] ?? s.aircraft.code
          : undefined,
        originTerminal: s.departure.terminal,
        destinationTerminal: s.arrival.terminal,
        cabin,
      };
    })
  );
}

export const amadeus: FlightProvider = {
  name: "amadeus",

  async searchOffers(q: SearchQuery): Promise<FlightOffer[]> {
    const token = await getToken();

    const params = new URLSearchParams({
      originLocationCode: q.origin,
      destinationLocationCode: q.destination,
      departureDate: q.departDate,
      adults: String(q.adults),
      travelClass: CABIN_MAP[q.cabin],
      currencyCode: "USD",
      max: "20",
    });
    if (q.children > 0) params.set("children", String(q.children));
    if (q.infants > 0) params.set("infants", String(q.infants));
    if (q.returnDate && q.tripType === "round_trip") {
      params.set("returnDate", q.returnDate);
    }
    if (q.nonStopOnly) params.set("nonStop", "true");
    if (q.preferredAirline) {
      params.set("includedAirlineCodes", q.preferredAirline.toUpperCase());
    }

    const res = await fetch(
      `${BASE}/v2/shopping/flight-offers?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      throw new Error(
        `Amadeus search failed: ${res.status} ${await res.text()}`
      );
    }

    const json = (await res.json()) as AmadeusResponse;
    const carriers = json.dictionaries?.carriers ?? {};
    const aircraftDict = json.dictionaries?.aircraft ?? {};
    const offers = json.data ?? [];

    return Promise.all(
      offers.map(async (o) => {
        const cabin =
          (o.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin?.toLowerCase() as Cabin) ??
          q.cabin;
        const outboundSegments = await buildSegments(
          o.itineraries[0]?.segments ?? [],
          cabin,
          carriers,
          aircraftDict
        );
        const returnSegments = o.itineraries[1]
          ? await buildSegments(
              o.itineraries[1].segments,
              cabin,
              carriers,
              aircraftDict
            )
          : undefined;

        const total = Number(o.price.total);
        const base = Number(o.price.base);
        const totalDurationMinutes = o.itineraries.reduce(
          (sum, it) => sum + parseIsoDuration(it.duration),
          0
        );

        return {
          id: `amadeus-${o.id}`,
          provider: "amadeus" as const,
          totalPriceUSD: total,
          baseFareUSD: base,
          taxesUSD: Math.max(0, Math.round((total - base) * 100) / 100),
          totalDurationMinutes,
          stops: Math.max(0, outboundSegments.length - 1),
          outboundSegments,
          returnSegments,
        };
      })
    );
  },
};
