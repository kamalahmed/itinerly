import prisma from "@/lib/db";
import type { Airport, Airline } from "@/lib/types";

// Process-level caches — airport/airline reference data is effectively static.
let airportCache: Map<string, Airport> | null = null;
let airlineCache: Map<string, Airline> | null = null;

async function loadAirports(): Promise<Map<string, Airport>> {
  if (airportCache) return airportCache;
  const rows = await prisma.airport.findMany({ include: { country: true } });
  const map = new Map<string, Airport>();
  for (const r of rows) {
    map.set(r.iata, {
      iata: r.iata,
      name: r.name,
      city: r.city,
      country: r.country.name,
      countryCode: r.country.iata2,
      timeZone: r.timeZone,
    });
  }
  airportCache = map;
  return map;
}

async function loadAirlines(): Promise<Map<string, Airline>> {
  if (airlineCache) return airlineCache;
  const rows = await prisma.airline.findMany();
  const map = new Map<string, Airline>();
  for (const r of rows) {
    map.set(r.iata, {
      iata: r.iata,
      name: r.name,
      logo: r.logo ?? `/airlines/${r.iata}.svg`,
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

/** Up to `limit` airports whose IATA, city, or name matches the query. */
export async function searchAirports(
  query: string,
  limit = 8
): Promise<Airport[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = await getAllAirports();
  const matches = all.filter(
    (a) =>
      a.iata.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q)
  );
  // IATA-exact and city-prefix matches first.
  matches.sort((a, b) => {
    const score = (x: Airport) =>
      (x.iata.toLowerCase() === q ? 0 : 0) +
      (x.city.toLowerCase().startsWith(q) ? 1 : 2);
    return score(a) - score(b);
  });
  return matches.slice(0, limit);
}
