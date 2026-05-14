import type {
  Airline,
  Airport,
  FlightOffer,
  FlightSegment,
  SearchQuery,
} from "@/lib/types";

export const DAC: Airport = {
  iata: "DAC",
  name: "Hazrat Shahjalal International Airport",
  city: "Dhaka",
  country: "Bangladesh",
  countryCode: "BD",
  timeZone: "Asia/Dhaka",
};

export const DXB: Airport = {
  iata: "DXB",
  name: "Dubai International Airport",
  city: "Dubai",
  country: "United Arab Emirates",
  countryCode: "AE",
  timeZone: "Asia/Dubai",
};

export const EK: Airline = { iata: "EK", name: "Emirates", logo: "/airlines/EK.svg" };
export const BG: Airline = {
  iata: "BG",
  name: "Biman Bangladesh Airlines",
  logo: "/airlines/BG.svg",
};

export function makeSegment(overrides: Partial<FlightSegment> = {}): FlightSegment {
  return {
    carrier: EK,
    flightNumber: "EK 583",
    origin: DAC,
    destination: DXB,
    departureLocal: "2026-06-01T09:55:00",
    arrivalLocal: "2026-06-01T13:20:00",
    durationMinutes: 325,
    aircraft: "Boeing 777-300ER",
    cabin: "economy",
    baggage: "30kg",
    ...overrides,
  };
}

export function makeOffer(overrides: Partial<FlightOffer> = {}): FlightOffer {
  const outboundSegments = overrides.outboundSegments ?? [makeSegment()];
  return {
    id: "mock-ow-1",
    provider: "mock",
    totalPriceUSD: 320,
    baseFareUSD: 256,
    taxesUSD: 64,
    totalDurationMinutes: 325,
    stops: 0,
    outboundSegments,
    refundable: false,
    ...overrides,
  };
}

export function makeQuery(overrides: Partial<SearchQuery> = {}): SearchQuery {
  return {
    origin: "DAC",
    destination: "DXB",
    departDate: "2026-06-01",
    cabin: "economy",
    adults: 1,
    children: 0,
    infants: 0,
    tripType: "one_way",
    ...overrides,
  };
}
