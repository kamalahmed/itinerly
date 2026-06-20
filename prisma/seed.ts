/**
 * itinerly seed — Bangladesh outbound flight data for the `mock` provider.
 *
 * Mirrors echoflights' approach: a seeded routes table joined against airlines
 * and airports. The mock provider only models direct flights, so long-haul
 * entries are synthetic "direct" rows (a believable carrier the buyer can pick
 * for a visa itinerary) — see DECISIONS.md.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { resolveSchedule } from "../lib/schedule";

const prisma = new PrismaClient();
const DATA = join(process.cwd(), "prisma", "data");

// --- Airlines (flag carriers + major global carriers, from JSON) -----------
type AirlineRow = {
  iata: string;
  name: string;
  countryCode: string;
  aircraft: string[];
};
const AIRLINES: AirlineRow[] = JSON.parse(
  readFileSync(join(DATA, "airlines.json"), "utf8")
);

// --- Countries + Airports (153 international airports, ~100 countries) ------
type AirportRow = {
  iata: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  timeZone: string;
  lat: number;
  lon: number;
};
const AIRPORTS: AirportRow[] = JSON.parse(
  readFileSync(join(DATA, "airports.json"), "utf8")
);

// --- Route definitions -----------------------------------------------------
// durationMin = nonstop block time from DAC; carriers = airlines serving it.
type DestSpec = {
  iata: string;
  durationMin: number;
  basePriceUSD: number;
  carriers: string[];
};

const DAC_DESTS: DestSpec[] = [
  // Middle East
  { iata: "DXB", durationMin: 330, basePriceUSD: 320, carriers: ["EK", "FZ", "BG", "BS"] },
  { iata: "AUH", durationMin: 345, basePriceUSD: 315, carriers: ["EY", "BG", "BS"] },
  { iata: "SHJ", durationMin: 350, basePriceUSD: 295, carriers: ["BG", "BS"] },
  { iata: "DOH", durationMin: 330, basePriceUSD: 310, carriers: ["QR", "BG"] },
  { iata: "MCT", durationMin: 330, basePriceUSD: 285, carriers: ["BG", "BS"] },
  { iata: "BAH", durationMin: 360, basePriceUSD: 300, carriers: ["GF"] },
  { iata: "KWI", durationMin: 390, basePriceUSD: 360, carriers: ["BG"] },
  { iata: "RUH", durationMin: 360, basePriceUSD: 340, carriers: ["SV", "BG", "BS"] },
  { iata: "JED", durationMin: 420, basePriceUSD: 380, carriers: ["SV", "BG", "BS"] },
  { iata: "DMM", durationMin: 380, basePriceUSD: 350, carriers: ["BG"] },
  { iata: "MED", durationMin: 420, basePriceUSD: 400, carriers: ["BG"] },
  // South Asia
  { iata: "CCU", durationMin: 60, basePriceUSD: 95, carriers: ["BG", "BS", "AI"] },
  { iata: "DEL", durationMin: 150, basePriceUSD: 165, carriers: ["BG", "AI", "6E"] },
  { iata: "BOM", durationMin: 215, basePriceUSD: 195, carriers: ["BG", "AI", "6E"] },
  { iata: "MAA", durationMin: 195, basePriceUSD: 175, carriers: ["BG", "6E"] },
  { iata: "BLR", durationMin: 210, basePriceUSD: 185, carriers: ["BG", "6E"] },
  { iata: "KTM", durationMin: 90, basePriceUSD: 130, carriers: ["BG", "BS"] },
  { iata: "CMB", durationMin: 165, basePriceUSD: 210, carriers: ["UL"] },
  { iata: "MLE", durationMin: 240, basePriceUSD: 260, carriers: ["BG", "BS", "UL"] },
  { iata: "KHI", durationMin: 270, basePriceUSD: 250, carriers: ["BG"] },
  // Southeast Asia
  { iata: "BKK", durationMin: 165, basePriceUSD: 230, carriers: ["BG", "BS", "TG"] },
  { iata: "DMK", durationMin: 170, basePriceUSD: 215, carriers: ["BG", "BS"] },
  { iata: "HKT", durationMin: 200, basePriceUSD: 245, carriers: ["BG"] },
  { iata: "KUL", durationMin: 230, basePriceUSD: 240, carriers: ["BG", "MH", "OD", "BS"] },
  { iata: "PEN", durationMin: 245, basePriceUSD: 250, carriers: ["MH", "BG"] },
  { iata: "SIN", durationMin: 255, basePriceUSD: 285, carriers: ["BG", "SQ"] },
  { iata: "CGK", durationMin: 295, basePriceUSD: 330, carriers: ["BG", "SQ"] },
  { iata: "DPS", durationMin: 320, basePriceUSD: 380, carriers: ["BG", "SQ"] },
  { iata: "RGN", durationMin: 80, basePriceUSD: 160, carriers: ["BG"] },
  { iata: "SGN", durationMin: 210, basePriceUSD: 290, carriers: ["BG", "SQ"] },
  { iata: "HAN", durationMin: 200, basePriceUSD: 285, carriers: ["BG"] },
  { iata: "MNL", durationMin: 280, basePriceUSD: 340, carriers: ["BG"] },
  // East Asia
  { iata: "HKG", durationMin: 245, basePriceUSD: 320, carriers: ["CX", "BG"] },
  { iata: "CAN", durationMin: 245, basePriceUSD: 330, carriers: ["BG", "CX"] },
  { iata: "PVG", durationMin: 300, basePriceUSD: 400, carriers: ["BG"] },
  { iata: "PEK", durationMin: 320, basePriceUSD: 420, carriers: ["BG"] },
  { iata: "KMG", durationMin: 165, basePriceUSD: 240, carriers: ["BG"] },
  { iata: "ICN", durationMin: 360, basePriceUSD: 470, carriers: ["BG"] },
  { iata: "NRT", durationMin: 390, basePriceUSD: 560, carriers: ["BG"] },
  { iata: "KIX", durationMin: 380, basePriceUSD: 540, carriers: ["BG"] },
  { iata: "TPE", durationMin: 290, basePriceUSD: 400, carriers: ["BG", "CX"] },
  // Long-haul: only genuine DAC NONSTOPS are seeded as direct routes. Every
  // other long-haul (Europe / North America via EK, QR, TK, EY) is a real
  // two-leg connection via the carrier's hub — see lib/connections.ts.
  { iata: "LHR", durationMin: 680, basePriceUSD: 620, carriers: ["BG"] }, // BG 301 nonstop
  { iata: "FCO", durationMin: 600, basePriceUSD: 620, carriers: ["BG"] }, // BG 355 nonstop
  { iata: "IST", durationMin: 535, basePriceUSD: 480, carriers: ["TK"] }, // TK 713 nonstop
];

// Secondary BD airports — realistic Middle East routes only.
const SECONDARY_ORIGINS = ["CGP", "ZYL", "BZL"] as const;
const SECONDARY_DESTS: DestSpec[] = [
  { iata: "DXB", durationMin: 345, basePriceUSD: 330, carriers: ["FZ", "BG", "BS"] },
  { iata: "AUH", durationMin: 360, basePriceUSD: 325, carriers: ["BG", "BS"] },
  { iata: "SHJ", durationMin: 365, basePriceUSD: 305, carriers: ["BG", "BS"] },
  { iata: "DOH", durationMin: 345, basePriceUSD: 320, carriers: ["BG", "BS"] },
  { iata: "MCT", durationMin: 345, basePriceUSD: 295, carriers: ["BG", "BS", "GF"] },
  { iata: "JED", durationMin: 435, basePriceUSD: 395, carriers: ["BG", "BS"] },
  { iata: "RUH", durationMin: 375, basePriceUSD: 355, carriers: ["BG", "BS"] },
  { iata: "KWI", durationMin: 405, basePriceUSD: 375, carriers: ["BG", "BS"] },
];

// --- Deterministic generators ---------------------------------------------
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const DEPARTURE_SLOTS = [
  "00:45", "02:10", "03:30", "06:15", "08:10", "09:55", "11:20",
  "13:40", "15:05", "17:30", "19:10", "20:45", "22:30", "23:55",
];

const PRICE_FACTOR: Record<string, number> = {
  EK: 1.18, QR: 1.15, SQ: 1.2, CX: 1.12, TK: 1.05, EY: 1.12,
  BG: 0.95, BS: 0.9, "2A": 0.88, FZ: 0.92, GF: 0.98, SV: 1.0,
  MH: 1.0, TG: 1.05, OD: 0.9, AI: 0.95, UL: 0.98, "6E": 0.88,
};

type RouteRow = {
  originIata: string;
  destinationIata: string;
  airlineIata: string;
  flightNumber: string;
  departureTimeLocal: string;
  arrivalTimeLocal: string | null;
  arrivalDayOffset: number;
  durationMinutes: number;
  aircraft: string;
  basePriceUSD: number;
};

// --- Curated REAL flights (researched from public airline timetables /
// Trip.com / flightconnections / airportia, mid-2026). Real flight numbers and
// departure times; arrival/duration are resolved tz-aware (lib/schedule.ts),
// trusting the researched arrival when it implies a sane block time. Only DAC
// nonstop routes are covered here — everything else falls back to synthetic. */
type RealFlight = {
  route: string; // "DAC-DXB"
  carrier: string;
  flightNumber: string;
  depart: string; // "HH:MM" local at origin
  arrive: string | null; // "HH:MM" local at destination
  aircraft: string;
};

const REAL_FLIGHTS: RealFlight[] = [
  // UAE
  { route: "DAC-DXB", carrier: "EK", flightNumber: "EK 587", depart: "19:30", arrive: "21:45", aircraft: "Boeing 777-300ER" },
  { route: "DAC-DXB", carrier: "FZ", flightNumber: "FZ 502", depart: "08:10", arrive: "12:00", aircraft: "Boeing 737 MAX 8" },
  { route: "DAC-DXB", carrier: "FZ", flightNumber: "FZ 524", depart: "22:00", arrive: "01:05", aircraft: "Boeing 737 MAX 8" },
  { route: "DAC-DXB", carrier: "BG", flightNumber: "BG 347", depart: "20:40", arrive: "00:30", aircraft: "Boeing 787-8" },
  { route: "DAC-DXB", carrier: "BS", flightNumber: "BS 341", depart: "22:15", arrive: "01:25", aircraft: "Boeing 737-800" },
  { route: "DAC-DXB", carrier: "BS", flightNumber: "BS 343", depart: "08:20", arrive: "11:30", aircraft: "Boeing 737-800" },
  { route: "DAC-AUH", carrier: "EY", flightNumber: "EY 383", depart: "21:35", arrive: "00:40", aircraft: "Boeing 787-9" },
  { route: "DAC-AUH", carrier: "BG", flightNumber: "BG 327", depart: "21:55", arrive: "00:55", aircraft: "Boeing 737-800" },
  { route: "DAC-AUH", carrier: "BS", flightNumber: "BS 349", depart: "08:00", arrive: "11:20", aircraft: "Boeing 737-800" },
  { route: "DAC-SHJ", carrier: "BG", flightNumber: "BG 351", depart: "20:50", arrive: "23:59", aircraft: "Boeing 737-800" },
  { route: "DAC-SHJ", carrier: "BS", flightNumber: "BS 345", depart: "21:15", arrive: "00:30", aircraft: "Boeing 737-800" },
  // Qatar
  { route: "DAC-DOH", carrier: "QR", flightNumber: "QR 639", depart: "04:10", arrive: "06:20", aircraft: "Boeing 777-300ER" },
  { route: "DAC-DOH", carrier: "QR", flightNumber: "QR 641", depart: "11:10", arrive: "13:20", aircraft: "Boeing 777-300ER" },
  { route: "DAC-DOH", carrier: "QR", flightNumber: "QR 643", depart: "19:05", arrive: "21:15", aircraft: "Boeing 777-300ER" },
  { route: "DAC-DOH", carrier: "BG", flightNumber: "BG 325", depart: "18:00", arrive: "20:30", aircraft: "Boeing 787-8" },
  // Saudi Arabia
  { route: "DAC-JED", carrier: "SV", flightNumber: "SV 803", depart: "02:35", arrive: "06:15", aircraft: "Boeing 777-300" },
  { route: "DAC-JED", carrier: "SV", flightNumber: "SV 811", depart: "05:55", arrive: "09:50", aircraft: "Boeing 777-300" },
  { route: "DAC-JED", carrier: "SV", flightNumber: "SV 809", depart: "13:20", arrive: "17:00", aircraft: "Boeing 777-300" },
  { route: "DAC-JED", carrier: "BG", flightNumber: "BG 531", depart: "03:15", arrive: "07:10", aircraft: "Boeing 777-300ER" },
  { route: "DAC-JED", carrier: "BG", flightNumber: "BG 331", depart: "14:20", arrive: "18:15", aircraft: "Boeing 777-300ER" },
  { route: "DAC-JED", carrier: "BG", flightNumber: "BG 335", depart: "19:20", arrive: "23:15", aircraft: "Boeing 777-300ER" },
  { route: "DAC-JED", carrier: "BS", flightNumber: "BS 361", depart: "17:00", arrive: "21:10", aircraft: "Airbus A330-300" },
  { route: "DAC-RUH", carrier: "SV", flightNumber: "SV 805", depart: "00:45", arrive: "03:40", aircraft: "Boeing 777-300" },
  { route: "DAC-RUH", carrier: "SV", flightNumber: "SV 807", depart: "11:25", arrive: "14:20", aircraft: "Boeing 777-300" },
  { route: "DAC-RUH", carrier: "BG", flightNumber: "BG 339", depart: "02:20", arrive: "05:20", aircraft: "Boeing 787-8" },
  { route: "DAC-RUH", carrier: "BG", flightNumber: "BG 539", depart: "23:55", arrive: "02:55", aircraft: "Boeing 787-8" },
  { route: "DAC-RUH", carrier: "BS", flightNumber: "BS 381", depart: "13:45", arrive: "18:00", aircraft: "Airbus A330-300" },
  { route: "DAC-MED", carrier: "BG", flightNumber: "BG 537", depart: "02:25", arrive: "06:00", aircraft: "Boeing 777-300ER" },
  { route: "DAC-MED", carrier: "BG", flightNumber: "BG 337", depart: "18:10", arrive: "21:45", aircraft: "Boeing 777-300ER" },
  { route: "DAC-DMM", carrier: "BG", flightNumber: "BG 349", depart: "15:10", arrive: "17:50", aircraft: "Boeing 787-8" },
  // Oman / Bahrain / Kuwait
  { route: "DAC-MCT", carrier: "BG", flightNumber: "BG 721", depart: "09:00", arrive: "12:20", aircraft: "Boeing 787-8" },
  { route: "DAC-MCT", carrier: "BS", flightNumber: "BS 321", depart: "22:15", arrive: "01:00", aircraft: "Boeing 737-800" },
  { route: "DAC-BAH", carrier: "GF", flightNumber: "GF 251", depart: "09:55", arrive: "12:30", aircraft: "Airbus A321neo" },
  { route: "DAC-BAH", carrier: "GF", flightNumber: "GF 249", depart: "20:00", arrive: "22:35", aircraft: "Boeing 787-9" },
  { route: "DAC-KWI", carrier: "BG", flightNumber: "BG 343", depart: "14:30", arrive: "18:20", aircraft: "Boeing 777-300" },
  // South Asia
  { route: "DAC-CCU", carrier: "BG", flightNumber: "BG 395", depart: "17:15", arrive: "17:45", aircraft: "De Havilland Dash 8-400" },
  { route: "DAC-CCU", carrier: "BS", flightNumber: "BS 201", depart: "10:00", arrive: "10:30", aircraft: "ATR 72-600" },
  { route: "DAC-CCU", carrier: "AI", flightNumber: "AI 1229", depart: "15:55", arrive: "17:05", aircraft: "Airbus A320neo" },
  { route: "DAC-DEL", carrier: "BG", flightNumber: "BG 397", depart: "12:00", arrive: "14:15", aircraft: "Boeing 737-800" },
  { route: "DAC-DEL", carrier: "AI", flightNumber: "AI 238", depart: "21:20", arrive: "23:05", aircraft: "Airbus A320" },
  { route: "DAC-DEL", carrier: "6E", flightNumber: "6E 1104", depart: "16:30", arrive: "18:40", aircraft: "Airbus A321neo" },
  { route: "DAC-KTM", carrier: "BG", flightNumber: "BG 371", depart: "10:05", arrive: "11:50", aircraft: "Boeing 737-800" },
  { route: "DAC-KTM", carrier: "BG", flightNumber: "BG 373", depart: "15:30", arrive: "17:00", aircraft: "Boeing 737-800" },
  { route: "DAC-KTM", carrier: "BS", flightNumber: "BS 211", depart: "10:03", arrive: "11:51", aircraft: "Boeing 737-800" },
  { route: "DAC-CMB", carrier: "UL", flightNumber: "UL 190", depart: "12:55", arrive: "15:10", aircraft: "Airbus A320" },
  // Southeast Asia
  { route: "DAC-BKK", carrier: "TG", flightNumber: "TG 340", depart: "02:45", arrive: "05:56", aircraft: "Boeing 787-8" },
  { route: "DAC-BKK", carrier: "TG", flightNumber: "TG 322", depart: "13:35", arrive: "17:00", aircraft: "Boeing 777-200ER" },
  { route: "DAC-BKK", carrier: "BS", flightNumber: "BS 217", depart: "10:00", arrive: "13:40", aircraft: "Boeing 737-800" },
  { route: "DAC-BKK", carrier: "BG", flightNumber: "BG 388", depart: "11:15", arrive: "15:00", aircraft: "Boeing 737-800" },
  { route: "DAC-KUL", carrier: "BG", flightNumber: "BG 386", depart: "19:15", arrive: "01:10", aircraft: "Boeing 737-800" },
  { route: "DAC-KUL", carrier: "MH", flightNumber: "MH 103", depart: "12:15", arrive: "17:43", aircraft: "Boeing 737 MAX 8" },
  { route: "DAC-KUL", carrier: "OD", flightNumber: "OD 161", depart: "01:10", arrive: "07:00", aircraft: "Boeing 737-800" },
  { route: "DAC-KUL", carrier: "OD", flightNumber: "OD 165", depart: "22:50", arrive: "04:40", aircraft: "Boeing 737-800" },
  { route: "DAC-KUL", carrier: "BS", flightNumber: "BS 315", depart: "08:25", arrive: "13:52", aircraft: "Boeing 737-800" },
  { route: "DAC-SIN", carrier: "BG", flightNumber: "BG 584", depart: "08:25", arrive: "14:40", aircraft: "Boeing 787-8" },
  { route: "DAC-SIN", carrier: "SQ", flightNumber: "SQ 447", depart: "23:55", arrive: "05:24", aircraft: "Boeing 787-10" },
  // Long-haul NONSTOPS (the only carriers that fly these without a stop).
  { route: "DAC-LHR", carrier: "BG", flightNumber: "BG 301", depart: "10:45", arrive: "17:05", aircraft: "Boeing 787-8" },
  { route: "DAC-FCO", carrier: "BG", flightNumber: "BG 355", depart: "11:30", arrive: "17:30", aircraft: "Boeing 787-8" },
  { route: "DAC-IST", carrier: "TK", flightNumber: "TK 713", depart: "06:50", arrive: "12:45", aircraft: "Airbus A330-300" },
];

const TZ_BY_IATA = new Map(AIRPORTS.map((a) => [a.iata, a.timeZone]));

function priceFor(carrier: string, d: DestSpec, salt: string): number {
  const factor = PRICE_FACTOR[carrier] ?? 1;
  const priceJitter = 1 + ((hash(salt) % 21) - 10) / 100; // ±10%
  return Math.round(d.basePriceUSD * factor * priceJitter);
}

function buildRoutes(origin: string, dests: DestSpec[]): RouteRow[] {
  const rows: RouteRow[] = [];
  for (const d of dests) {
    const origTz = TZ_BY_IATA.get(origin);
    const destTz = TZ_BY_IATA.get(d.iata);
    d.carriers.forEach((carrier, idx) => {
      // Curated real flights for this exact origin/dest/carrier, if any.
      const reals = REAL_FLIGHTS.filter(
        (f) => f.route === `${origin}-${d.iata}` && f.carrier === carrier
      );

      if (reals.length > 0 && origTz && destTz) {
        for (const rf of reals) {
          const sched = resolveSchedule(
            rf.depart,
            rf.arrive,
            origTz,
            destTz,
            d.durationMin
          );
          rows.push({
            originIata: origin,
            destinationIata: d.iata,
            airlineIata: carrier,
            flightNumber: rf.flightNumber,
            departureTimeLocal: rf.depart,
            arrivalTimeLocal: sched.arrivalTimeLocal,
            arrivalDayOffset: sched.arrivalDayOffset,
            durationMinutes: sched.durationMinutes,
            aircraft: rf.aircraft,
            basePriceUSD: priceFor(carrier, d, rf.flightNumber),
          });
        }
        return;
      }

      // Synthetic fallback for routes/carriers without curated real data.
      const key = `${origin}-${d.iata}-${carrier}`;
      const h = hash(key);
      const airline = AIRLINES.find((a) => a.iata === carrier)!;
      const slot = DEPARTURE_SLOTS[(h + idx * 3) % DEPARTURE_SLOTS.length];
      const flightNo =
        carrier === "2A" || carrier === "6E"
          ? `${carrier} ${100 + (h % 800)}`
          : `${carrier} ${100 + (h % 900)}`;
      const aircraft = airline.aircraft[h % airline.aircraft.length];
      const jitter = (h % 36) - 10; // -10..+25 minutes
      const durationMinutes = Math.max(45, d.durationMin + jitter);
      rows.push({
        originIata: origin,
        destinationIata: d.iata,
        airlineIata: carrier,
        flightNumber: flightNo,
        departureTimeLocal: slot,
        arrivalTimeLocal: null,
        arrivalDayOffset: 0,
        durationMinutes,
        aircraft,
        basePriceUSD: priceFor(carrier, d, key),
      });
    });
  }
  return rows;
}

async function main() {
  console.log("Seeding itinerly database…");

  // Reset (idempotent)
  await prisma.seededRoute.deleteMany();
  await prisma.searchCache.deleteMany();
  await prisma.airport.deleteMany();
  await prisma.airline.deleteMany();
  await prisma.country.deleteMany();

  // Countries
  const countryMap = new Map<string, number>();
  const uniqueCountries = new Map<string, string>();
  for (const a of AIRPORTS) uniqueCountries.set(a.countryCode, a.country);
  for (const [code, name] of uniqueCountries) {
    const c = await prisma.country.create({
      data: { name, iata2: code },
    });
    countryMap.set(code, c.id);
  }

  // Airports (de-duplicated by IATA)
  const seenIata = new Set<string>();
  for (const a of AIRPORTS) {
    if (seenIata.has(a.iata)) continue;
    seenIata.add(a.iata);
    await prisma.airport.create({
      data: {
        iata: a.iata,
        name: a.name,
        city: a.city,
        timeZone: a.timeZone,
        lat: a.lat,
        lon: a.lon,
        countryId: countryMap.get(a.countryCode)!,
      },
    });
  }

  // Airlines
  for (const a of AIRLINES) {
    await prisma.airline.create({
      data: { iata: a.iata, name: a.name, countryCode: a.countryCode, logo: `/airlines/${a.iata}.svg` },
    });
  }

  // Routes
  const routes: RouteRow[] = [
    ...buildRoutes("DAC", DAC_DESTS),
    ...SECONDARY_ORIGINS.flatMap((o) => buildRoutes(o, SECONDARY_DESTS)),
  ];
  await prisma.seededRoute.createMany({ data: routes });

  console.log(
    `Seeded ${uniqueCountries.size} countries, ${seenIata.size} airports, ` +
      `${AIRLINES.length} airlines, ${routes.length} routes.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
