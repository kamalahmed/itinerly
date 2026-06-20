/**
 * Offline enrichment: spend a small, budgeted number of AviationStack calls to
 * write REAL flight schedules into the SeededRoute table. The app then serves
 * from our DB only (no per-search API calls), so the free-tier quota lasts.
 *
 * Run after `prisma db seed`:
 *   AVIATIONSTACK_API_KEY=... ENRICH_MAX_CALLS=20 pnpm enrich
 * Re-run periodically to refresh; re-seeding wipes routes, so enrich again after.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { resolveSchedule } from "../lib/schedule";
import { fetchRouteFlights } from "../lib/providers/aviationstack";
import { haversineKm, estimateBlockMinutes, priceForKm } from "../lib/synthetic";

const prisma = new PrismaClient();
const DATA = join(process.cwd(), "prisma", "data");

type Ap = { iata: string; timeZone: string; lat: number; lon: number };
const airports: Ap[] = JSON.parse(
  readFileSync(join(DATA, "airports.json"), "utf8")
);
const byIata = new Map(airports.map((a) => [a.iata, a]));

const MAX_CALLS = Number(process.env.ENRICH_MAX_CALLS ?? 25);

// Bidirectional Bangladesh + UAE markets (the routes with real nonstops).
const ORIGINS = ["DAC", "DXB", "AUH", "CGP"];
const DESTS = [
  "DXB", "DOH", "AUH", "SHJ", "JED", "RUH", "MCT", "KWI", "BAH",
  "CCU", "DEL", "BOM", "KTM", "CMB", "MLE", "KHI",
  "BKK", "KUL", "SIN", "IST", "LHR",
];

function aircraftFor(km: number): string {
  if (km < 1500) return "Airbus A320";
  if (km < 4500) return "Boeing 737-800";
  return "Boeing 787-9";
}

async function ensureAirline(iata: string, name: string): Promise<void> {
  await prisma.airline
    .upsert({
      where: { iata },
      create: { iata, name, logo: `/airlines/${iata}.svg` },
      update: {},
    })
    .catch(() => {});
}

async function enrichRoute(origin: string, dest: string): Promise<number> {
  const oa = byIata.get(origin);
  const da = byIata.get(dest);
  if (!oa || !da) return 0;

  const flights = await fetchRouteFlights(origin, dest);
  if (flights.length === 0) return 0;

  const km = haversineKm(oa as never, da as never) || 0;
  const nominal = km ? estimateBlockMinutes(km) : 120;

  await prisma.seededRoute.deleteMany({
    where: { originIata: origin, destinationIata: dest },
  });

  const rows = [];
  for (const f of flights) {
    await ensureAirline(f.carrierIata, f.carrierName);
    const sched = resolveSchedule(f.depart, f.arrive, oa.timeZone, da.timeZone, nominal, 9999);
    rows.push({
      originIata: origin,
      destinationIata: dest,
      airlineIata: f.carrierIata,
      flightNumber: f.flightNumber,
      departureTimeLocal: f.depart,
      arrivalTimeLocal: sched.arrivalTimeLocal,
      arrivalDayOffset: sched.arrivalDayOffset,
      durationMinutes: sched.durationMinutes,
      aircraft: aircraftFor(km),
      basePriceUSD: priceForKm(km, f.carrierIata),
    });
  }
  await prisma.seededRoute.createMany({ data: rows });
  return rows.length;
}

async function main() {
  if (!process.env.AVIATIONSTACK_API_KEY) {
    console.error("AVIATIONSTACK_API_KEY is not set.");
    process.exit(1);
  }
  const routes: [string, string][] = [];
  for (const o of ORIGINS) for (const d of DESTS) if (o !== d) routes.push([o, d]);

  let calls = 0;
  let added = 0;
  for (const [o, d] of routes) {
    if (calls >= MAX_CALLS) {
      console.log(`Budget of ${MAX_CALLS} API calls reached — stopping.`);
      break;
    }
    try {
      const n = await enrichRoute(o, d);
      calls++;
      if (n > 0) {
        added += n;
        console.log(`${o}->${d}: ${n} real flights`);
      }
    } catch (e) {
      calls++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${o}->${d}: ${msg}`);
      if (msg.includes("429")) {
        console.log("Rate/quota limit hit — stopping.");
        break;
      }
    }
  }
  console.log(`\nEnriched ${added} real flights using ${calls} API calls.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
