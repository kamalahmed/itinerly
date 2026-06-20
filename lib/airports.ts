import prisma from "@/lib/db";
import type { Airport, Airline } from "@/lib/types";
import { withTimeout, DB_TIMEOUT_MS } from "@/lib/with-timeout";

// Process-level caches — airport/airline reference data is effectively static.
let airportCache: Map<string, Airport> | null = null;
let airlineCache: Map<string, Airline> | null = null;

async function loadAirports(): Promise<Map<string, Airport>> {
  if (airportCache) return airportCache;
  const rows = await withTimeout(
    prisma.airport.findMany({ include: { country: true } }),
    DB_TIMEOUT_MS,
    "load airports"
  );
  const map = new Map<string, Airport>();
  for (const r of rows) {
    map.set(r.iata, {
      iata: r.iata,
      name: r.name,
      city: r.city,
      country: r.country.name,
      countryCode: r.country.iata2,
      timeZone: r.timeZone,
      lat: r.lat ?? undefined,
      lon: r.lon ?? undefined,
    });
  }
  airportCache = map;
  return map;
}

async function loadAirlines(): Promise<Map<string, Airline>> {
  if (airlineCache) return airlineCache;
  const rows = await withTimeout(
    prisma.airline.findMany(),
    DB_TIMEOUT_MS,
    "load airlines"
  );
  const map = new Map<string, Airline>();
  for (const r of rows) {
    map.set(r.iata, {
      iata: r.iata,
      name: r.name,
      logo: r.logo ?? `/airlines/${r.iata}.svg`,
      countryCode: r.countryCode ?? undefined,
    });
  }
  airlineCache = map;
  return map;
}

export async function getAirport(iata: string): Promise<Airport | null> {
  return (await loadAirports()).get(iata) ?? null;
}

export async function getAirline(iata: string): Promise<Airline | null> {
  return (await loadAirlines()).get(iata) ?? null;
}

export async function getAllAirports(): Promise<Airport[]> {
  return [...(await loadAirports()).values()];
}

export async function getAllAirlines(): Promise<Airline[]> {
  return [...(await loadAirlines()).values()];
}

/** Airports in a given ISO-2 country (for the geo-located default origin list). */
export async function airportsByCountry(
  countryCode: string,
  limit = 8
): Promise<Airport[]> {
  const cc = countryCode.trim().toUpperCase();
  if (!cc) return [];
  const all = await getAllAirports();
  return all
    .filter((a) => a.countryCode.toUpperCase() === cc)
    .sort((a, b) => a.city.localeCompare(b.city))
    .slice(0, limit);
}

/**
 * Up to `limit` airports matching the query by IATA code, city, airport name,
 * OR country — ranked by how the user expects: IATA first (DAC), then city
 * (Dhaka), then country (Bangladesh / Thailand → all that country's airports).
 */
export async function searchAirports(
  query: string,
  limit = 10
): Promise<Airport[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await getAllAirports();

  const scored: { a: Airport; score: number }[] = [];
  for (const a of all) {
    const iata = a.iata.toLowerCase();
    const city = a.city.toLowerCase();
    const name = a.name.toLowerCase();
    const country = a.country.toLowerCase();
    const cc = a.countryCode.toLowerCase();

    let score = -1;
    if (iata === q) score = 0; // exact IATA — best
    else if (iata.startsWith(q)) score = 1;
    else if (city === q) score = 2;
    else if (city.startsWith(q)) score = 3;
    else if (country === q || cc === q) score = 4; // "thailand" / "th"
    else if (country.startsWith(q)) score = 5;
    else if (city.includes(q)) score = 6;
    else if (country.includes(q)) score = 7;
    else if (name.includes(q)) score = 8;
    else if (iata.includes(q)) score = 9;

    if (score >= 0) scored.push({ a, score });
  }

  scored.sort(
    (x, y) => x.score - y.score || x.a.city.localeCompare(y.a.city)
  );
  return scored.slice(0, limit).map((x) => x.a);
}
