export type Cabin = "economy" | "premium_economy" | "business" | "first";
export type TripType = "one_way" | "round_trip" | "multi_city";

export interface Airport {
  iata: string; // "DAC"
  name: string; // "Hazrat Shahjalal International Airport"
  city: string; // "Dhaka"
  country: string; // "Bangladesh"
  countryCode: string; // "BD"
  timeZone: string; // "Asia/Dhaka"
}

export interface Airline {
  iata: string; // "FZ"
  name: string; // "flydubai"
  logo: string; // "/airlines/FZ.svg"
}

export interface FlightSegment {
  carrier: Airline;
  flightNumber: string; // "FZ 502"
  origin: Airport;
  destination: Airport;
  departureLocal: string; // ISO 8601 local
  arrivalLocal: string;
  durationMinutes: number;
  aircraft?: string; // "Boeing 737 MAX 8"
  originTerminal?: string;
  destinationTerminal?: string;
  cabin: Cabin;
  baggage?: string; // "30kg"
}

export interface FlightOffer {
  id: string; // opaque provider key
  provider: "duffel" | "amadeus" | "travelpayouts" | "mock";
  totalPriceUSD: number;
  baseFareUSD: number;
  taxesUSD: number;
  totalDurationMinutes: number;
  stops: number;
  outboundSegments: FlightSegment[];
  returnSegments?: FlightSegment[];
  refundable?: boolean;
  expiresAt?: string; // ISO
}

export interface SearchQuery {
  origin: string; // IATA
  destination: string;
  departDate: string; // YYYY-MM-DD
  returnDate?: string;
  cabin: Cabin;
  adults: number;
  children: number;
  infants: number;
  tripType: TripType;
  preferredAirline?: string;
  nonStopOnly?: boolean;
}

export interface PassengerDetails {
  title: string;
  fullName: string;
  dob: string; // YYYY-MM-DD
  nationality: string;
  passportNumber: string;
  passportExpiry: string; // YYYY-MM-DD
}

export interface FlightProvider {
  name: string;
  searchOffers(q: SearchQuery): Promise<FlightOffer[]>;
  getOffer?(id: string): Promise<FlightOffer | null>;
}
