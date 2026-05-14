/**
 * itinerly seed — Bangladesh outbound flight data for the `mock` provider.
 *
 * Mirrors echoflights' approach: a seeded routes table joined against airlines
 * and airports. The mock provider only models direct flights, so long-haul
 * entries are synthetic "direct" rows (a believable carrier the buyer can pick
 * for a visa itinerary) — see DECISIONS.md.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// --- Airlines (exactly the carriers requested) -----------------------------
const AIRLINES: { iata: string; name: string; aircraft: string[] }[] = [
  { iata: "BG", name: "Biman Bangladesh Airlines", aircraft: ["Boeing 787-9", "Boeing 737-800", "Boeing 777-300ER"] },
  { iata: "BS", name: "US-Bangla Airlines", aircraft: ["Boeing 737-800", "Airbus A330-300", "ATR 72-600"] },
  { iata: "2A", name: "Air Astra", aircraft: ["ATR 72-600"] },
  { iata: "EK", name: "Emirates", aircraft: ["Boeing 777-300ER", "Airbus A380-800"] },
  { iata: "QR", name: "Qatar Airways", aircraft: ["Boeing 787-8", "Airbus A350-900"] },
  { iata: "FZ", name: "flydubai", aircraft: ["Boeing 737 MAX 8", "Boeing 737-800"] },
  { iata: "GF", name: "Gulf Air", aircraft: ["Airbus A320neo", "Airbus A321neo"] },
  { iata: "EY", name: "Etihad Airways", aircraft: ["Boeing 787-9", "Airbus A321neo"] },
  { iata: "SV", name: "Saudia", aircraft: ["Airbus A330-300", "Boeing 787-9"] },
  { iata: "TK", name: "Turkish Airlines", aircraft: ["Airbus A330-300", "Boeing 777-300ER"] },
  { iata: "SQ", name: "Singapore Airlines", aircraft: ["Boeing 787-10", "Airbus A350-900"] },
  { iata: "MH", name: "Malaysia Airlines", aircraft: ["Boeing 737-800", "Airbus A330-300"] },
  { iata: "TG", name: "Thai Airways", aircraft: ["Boeing 787-8", "Airbus A350-900"] },
  { iata: "OD", name: "Batik Air Malaysia", aircraft: ["Boeing 737-800", "Airbus A320"] },
  { iata: "AI", name: "Air India", aircraft: ["Airbus A320neo", "Boeing 787-8"] },
  { iata: "UL", name: "SriLankan Airlines", aircraft: ["Airbus A320neo", "Airbus A330-300"] },
  { iata: "CX", name: "Cathay Pacific", aircraft: ["Airbus A330-300", "Airbus A350-900"] },
  { iata: "6E", name: "IndiGo", aircraft: ["Airbus A320neo", "Airbus A321neo"] },
];

// --- Countries + Airports --------------------------------------------------
type AirportRow = {
  iata: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  timeZone: string;
};

const AIRPORTS: AirportRow[] = [
  // Bangladesh origins
  { iata: "DAC", name: "Hazrat Shahjalal International Airport", city: "Dhaka", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka" },
  { iata: "CGP", name: "Shah Amanat International Airport", city: "Chittagong", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka" },
  { iata: "ZYL", name: "Osmani International Airport", city: "Sylhet", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka" },
  { iata: "BZL", name: "Barishal Airport", city: "Barishal", country: "Bangladesh", countryCode: "BD", timeZone: "Asia/Dhaka" },
  // Middle East
  { iata: "DXB", name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates", countryCode: "AE", timeZone: "Asia/Dubai" },
  { iata: "AUH", name: "Zayed International Airport", city: "Abu Dhabi", country: "United Arab Emirates", countryCode: "AE", timeZone: "Asia/Dubai" },
  { iata: "SHJ", name: "Sharjah International Airport", city: "Sharjah", country: "United Arab Emirates", countryCode: "AE", timeZone: "Asia/Dubai" },
  { iata: "DOH", name: "Hamad International Airport", city: "Doha", country: "Qatar", countryCode: "QA", timeZone: "Asia/Qatar" },
  { iata: "MCT", name: "Muscat International Airport", city: "Muscat", country: "Oman", countryCode: "OM", timeZone: "Asia/Muscat" },
  { iata: "BAH", name: "Bahrain International Airport", city: "Manama", country: "Bahrain", countryCode: "BH", timeZone: "Asia/Bahrain" },
  { iata: "KWI", name: "Kuwait International Airport", city: "Kuwait City", country: "Kuwait", countryCode: "KW", timeZone: "Asia/Kuwait" },
  { iata: "RUH", name: "King Khalid International Airport", city: "Riyadh", country: "Saudi Arabia", countryCode: "SA", timeZone: "Asia/Riyadh" },
  { iata: "JED", name: "King Abdulaziz International Airport", city: "Jeddah", country: "Saudi Arabia", countryCode: "SA", timeZone: "Asia/Riyadh" },
  { iata: "DMM", name: "King Fahd International Airport", city: "Dammam", country: "Saudi Arabia", countryCode: "SA", timeZone: "Asia/Riyadh" },
  { iata: "MED", name: "Prince Mohammad bin Abdulaziz Airport", city: "Medina", country: "Saudi Arabia", countryCode: "SA", timeZone: "Asia/Riyadh" },
  // South Asia
  { iata: "CCU", name: "Netaji Subhas Chandra Bose Airport", city: "Kolkata", country: "India", countryCode: "IN", timeZone: "Asia/Kolkata" },
  { iata: "DEL", name: "Indira Gandhi International Airport", city: "New Delhi", country: "India", countryCode: "IN", timeZone: "Asia/Kolkata" },
  { iata: "BOM", name: "Chhatrapati Shivaji Maharaj Airport", city: "Mumbai", country: "India", countryCode: "IN", timeZone: "Asia/Kolkata" },
  { iata: "MAA", name: "Chennai International Airport", city: "Chennai", country: "India", countryCode: "IN", timeZone: "Asia/Kolkata" },
  { iata: "BLR", name: "Kempegowda International Airport", city: "Bengaluru", country: "India", countryCode: "IN", timeZone: "Asia/Kolkata" },
  { iata: "KTM", name: "Tribhuvan International Airport", city: "Kathmandu", country: "Nepal", countryCode: "NP", timeZone: "Asia/Kathmandu" },
  { iata: "CMB", name: "Bandaranaike International Airport", city: "Colombo", country: "Sri Lanka", countryCode: "LK", timeZone: "Asia/Colombo" },
  { iata: "MLE", name: "Velana International Airport", city: "Malé", country: "Maldives", countryCode: "MV", timeZone: "Indian/Maldives" },
  { iata: "KHI", name: "Jinnah International Airport", city: "Karachi", country: "Pakistan", countryCode: "PK", timeZone: "Asia/Karachi" },
  // Southeast Asia
  { iata: "BKK", name: "Suvarnabhumi Airport", city: "Bangkok", country: "Thailand", countryCode: "TH", timeZone: "Asia/Bangkok" },
  { iata: "DMK", name: "Don Mueang International Airport", city: "Bangkok", country: "Thailand", countryCode: "TH", timeZone: "Asia/Bangkok" },
  { iata: "HKT", name: "Phuket International Airport", city: "Phuket", country: "Thailand", countryCode: "TH", timeZone: "Asia/Bangkok" },
  { iata: "KUL", name: "Kuala Lumpur International Airport", city: "Kuala Lumpur", country: "Malaysia", countryCode: "MY", timeZone: "Asia/Kuala_Lumpur" },
  { iata: "PEN", name: "Penang International Airport", city: "Penang", country: "Malaysia", countryCode: "MY", timeZone: "Asia/Kuala_Lumpur" },
  { iata: "SIN", name: "Singapore Changi Airport", city: "Singapore", country: "Singapore", countryCode: "SG", timeZone: "Asia/Singapore" },
  { iata: "CGK", name: "Soekarno-Hatta International Airport", city: "Jakarta", country: "Indonesia", countryCode: "ID", timeZone: "Asia/Jakarta" },
  { iata: "DPS", name: "Ngurah Rai International Airport", city: "Denpasar", country: "Indonesia", countryCode: "ID", timeZone: "Asia/Makassar" },
  { iata: "RGN", name: "Yangon International Airport", city: "Yangon", country: "Myanmar", countryCode: "MM", timeZone: "Asia/Yangon" },
  { iata: "SGN", name: "Tan Son Nhat International Airport", city: "Ho Chi Minh City", country: "Vietnam", countryCode: "VN", timeZone: "Asia/Ho_Chi_Minh" },
  { iata: "HAN", name: "Noi Bai International Airport", city: "Hanoi", country: "Vietnam", countryCode: "VN", timeZone: "Asia/Ho_Chi_Minh" },
  { iata: "MNL", name: "Ninoy Aquino International Airport", city: "Manila", country: "Philippines", countryCode: "PH", timeZone: "Asia/Manila" },
  // East Asia
  { iata: "HKG", name: "Hong Kong International Airport", city: "Hong Kong", country: "Hong Kong", countryCode: "HK", timeZone: "Asia/Hong_Kong" },
  { iata: "CAN", name: "Guangzhou Baiyun International Airport", city: "Guangzhou", country: "China", countryCode: "CN", timeZone: "Asia/Shanghai" },
  { iata: "PVG", name: "Shanghai Pudong International Airport", city: "Shanghai", country: "China", countryCode: "CN", timeZone: "Asia/Shanghai" },
  { iata: "PEK", name: "Beijing Capital International Airport", city: "Beijing", country: "China", countryCode: "CN", timeZone: "Asia/Shanghai" },
  { iata: "KMG", name: "Kunming Changshui International Airport", city: "Kunming", country: "China", countryCode: "CN", timeZone: "Asia/Shanghai" },
  { iata: "ICN", name: "Incheon International Airport", city: "Seoul", country: "South Korea", countryCode: "KR", timeZone: "Asia/Seoul" },
  { iata: "NRT", name: "Narita International Airport", city: "Tokyo", country: "Japan", countryCode: "JP", timeZone: "Asia/Tokyo" },
  { iata: "KIX", name: "Kansai International Airport", city: "Osaka", country: "Japan", countryCode: "JP", timeZone: "Asia/Tokyo" },
  { iata: "TPE", name: "Taoyuan International Airport", city: "Taipei", country: "Taiwan", countryCode: "TW", timeZone: "Asia/Taipei" },
  // Europe
  { iata: "LHR", name: "London Heathrow Airport", city: "London", country: "United Kingdom", countryCode: "GB", timeZone: "Europe/London" },
  { iata: "LGW", name: "London Gatwick Airport", city: "London", country: "United Kingdom", countryCode: "GB", timeZone: "Europe/London" },
  { iata: "MAN", name: "Manchester Airport", city: "Manchester", country: "United Kingdom", countryCode: "GB", timeZone: "Europe/London" },
  { iata: "CDG", name: "Paris Charles de Gaulle Airport", city: "Paris", country: "France", countryCode: "FR", timeZone: "Europe/Paris" },
  { iata: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", countryCode: "DE", timeZone: "Europe/Berlin" },
  { iata: "AMS", name: "Amsterdam Airport Schiphol", city: "Amsterdam", country: "Netherlands", countryCode: "NL", timeZone: "Europe/Amsterdam" },
  { iata: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Türkiye", countryCode: "TR", timeZone: "Europe/Istanbul" },
  { iata: "FCO", name: "Rome Fiumicino Airport", city: "Rome", country: "Italy", countryCode: "IT", timeZone: "Europe/Rome" },
  { iata: "MXP", name: "Milan Malpensa Airport", city: "Milan", country: "Italy", countryCode: "IT", timeZone: "Europe/Rome" },
  { iata: "MAD", name: "Adolfo Suárez Madrid–Barajas Airport", city: "Madrid", country: "Spain", countryCode: "ES", timeZone: "Europe/Madrid" },
  { iata: "BCN", name: "Barcelona–El Prat Airport", city: "Barcelona", country: "Spain", countryCode: "ES", timeZone: "Europe/Madrid" },
  { iata: "ZRH", name: "Zurich Airport", city: "Zurich", country: "Switzerland", countryCode: "CH", timeZone: "Europe/Zurich" },
  { iata: "ARN", name: "Stockholm Arlanda Airport", city: "Stockholm", country: "Sweden", countryCode: "SE", timeZone: "Europe/Stockholm" },
  // North America
  { iata: "JFK", name: "John F. Kennedy International Airport", city: "New York", country: "United States", countryCode: "US", timeZone: "America/New_York" },
  { iata: "EWR", name: "Newark Liberty International Airport", city: "Newark", country: "United States", countryCode: "US", timeZone: "America/New_York" },
  { iata: "IAD", name: "Washington Dulles International Airport", city: "Washington", country: "United States", countryCode: "US", timeZone: "America/New_York" },
  { iata: "ORD", name: "O'Hare International Airport", city: "Chicago", country: "United States", countryCode: "US", timeZone: "America/Chicago" },
  { iata: "LAX", name: "Los Angeles International Airport", city: "Los Angeles", country: "United States", countryCode: "US", timeZone: "America/Los_Angeles" },
  { iata: "YYZ", name: "Toronto Pearson International Airport", city: "Toronto", country: "Canada", countryCode: "CA", timeZone: "America/Toronto" },
  { iata: "YVR", name: "Vancouver International Airport", city: "Vancouver", country: "Canada", countryCode: "CA", timeZone: "America/Vancouver" },
  // Oceania
  { iata: "SYD", name: "Sydney Kingsford Smith Airport", city: "Sydney", country: "Australia", countryCode: "AU", timeZone: "Australia/Sydney" },
  { iata: "MEL", name: "Melbourne Airport", city: "Melbourne", country: "Australia", countryCode: "AU", timeZone: "Australia/Melbourne" },
  // Africa
  { iata: "CAI", name: "Cairo International Airport", city: "Cairo", country: "Egypt", countryCode: "EG", timeZone: "Africa/Cairo" },
  { iata: "NBO", name: "Jomo Kenyatta International Airport", city: "Nairobi", country: "Kenya", countryCode: "KE", timeZone: "Africa/Nairobi" },
  { iata: "JNB", name: "O.R. Tambo International Airport", city: "Johannesburg", country: "South Africa", countryCode: "ZA", timeZone: "Africa/Johannesburg" },
];

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
  { iata: "DOH", durationMin: 330, basePriceUSD: 310, carriers: ["QR", "BG", "BS"] },
  { iata: "MCT", durationMin: 330, basePriceUSD: 285, carriers: ["BG", "BS", "GF"] },
  { iata: "BAH", durationMin: 360, basePriceUSD: 300, carriers: ["GF", "BG"] },
  { iata: "KWI", durationMin: 390, basePriceUSD: 360, carriers: ["BG", "BS", "GF"] },
  { iata: "RUH", durationMin: 360, basePriceUSD: 340, carriers: ["SV", "BG", "BS"] },
  { iata: "JED", durationMin: 420, basePriceUSD: 380, carriers: ["SV", "BG", "BS"] },
  { iata: "DMM", durationMin: 380, basePriceUSD: 350, carriers: ["SV", "BG"] },
  { iata: "MED", durationMin: 420, basePriceUSD: 400, carriers: ["SV", "BG"] },
  // South Asia
  { iata: "CCU", durationMin: 60, basePriceUSD: 95, carriers: ["BG", "BS", "AI"] },
  { iata: "DEL", durationMin: 150, basePriceUSD: 165, carriers: ["BG", "BS", "AI", "6E"] },
  { iata: "BOM", durationMin: 215, basePriceUSD: 195, carriers: ["BG", "AI", "6E"] },
  { iata: "MAA", durationMin: 195, basePriceUSD: 175, carriers: ["BG", "6E"] },
  { iata: "BLR", durationMin: 210, basePriceUSD: 185, carriers: ["BG", "6E"] },
  { iata: "KTM", durationMin: 90, basePriceUSD: 130, carriers: ["BG", "BS"] },
  { iata: "CMB", durationMin: 165, basePriceUSD: 210, carriers: ["UL", "BG"] },
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
  // Europe (BG nonstop + Gulf/Turkish carriers offered as one-stop "direct" mock entries)
  { iata: "LHR", durationMin: 660, basePriceUSD: 620, carriers: ["BG", "EK", "QR", "TK"] },
  { iata: "LGW", durationMin: 665, basePriceUSD: 600, carriers: ["BG", "EK"] },
  { iata: "MAN", durationMin: 670, basePriceUSD: 610, carriers: ["BG", "EK", "QR"] },
  { iata: "CDG", durationMin: 615, basePriceUSD: 640, carriers: ["EK", "QR", "TK", "BG"] },
  { iata: "FRA", durationMin: 600, basePriceUSD: 650, carriers: ["EK", "QR", "TK"] },
  { iata: "AMS", durationMin: 610, basePriceUSD: 645, carriers: ["EK", "QR", "TK"] },
  { iata: "IST", durationMin: 540, basePriceUSD: 480, carriers: ["TK", "BG"] },
  { iata: "FCO", durationMin: 570, basePriceUSD: 620, carriers: ["QR", "TK", "EK"] },
  { iata: "MXP", durationMin: 575, basePriceUSD: 615, carriers: ["QR", "EK", "TK"] },
  { iata: "MAD", durationMin: 620, basePriceUSD: 660, carriers: ["QR", "TK", "EK"] },
  { iata: "BCN", durationMin: 615, basePriceUSD: 655, carriers: ["QR", "TK", "EK"] },
  { iata: "ZRH", durationMin: 580, basePriceUSD: 660, carriers: ["EK", "QR", "TK"] },
  { iata: "ARN", durationMin: 600, basePriceUSD: 640, carriers: ["TK", "QR"] },
  // North America (Gulf/Turkish carriers as long "direct" mock entries)
  { iata: "JFK", durationMin: 960, basePriceUSD: 980, carriers: ["QR", "EK", "TK"] },
  { iata: "EWR", durationMin: 965, basePriceUSD: 970, carriers: ["QR", "EK"] },
  { iata: "IAD", durationMin: 945, basePriceUSD: 960, carriers: ["QR", "EK", "TK"] },
  { iata: "ORD", durationMin: 990, basePriceUSD: 1010, carriers: ["QR", "EK", "TK"] },
  { iata: "LAX", durationMin: 1020, basePriceUSD: 1080, carriers: ["QR", "EK"] },
  { iata: "YYZ", durationMin: 900, basePriceUSD: 940, carriers: ["EK", "QR", "TK"] },
  { iata: "YVR", durationMin: 960, basePriceUSD: 1000, carriers: ["EK", "QR"] },
  // Oceania
  { iata: "SYD", durationMin: 600, basePriceUSD: 720, carriers: ["SQ", "MH", "TG"] },
  { iata: "MEL", durationMin: 610, basePriceUSD: 715, carriers: ["SQ", "MH"] },
  // Africa
  { iata: "CAI", durationMin: 540, basePriceUSD: 560, carriers: ["SV", "QR"] },
  { iata: "NBO", durationMin: 480, basePriceUSD: 600, carriers: ["QR", "EK"] },
  { iata: "JNB", durationMin: 660, basePriceUSD: 780, carriers: ["QR", "EK"] },
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
  durationMinutes: number;
  aircraft: string;
  basePriceUSD: number;
};

function buildRoutes(origin: string, dests: DestSpec[]): RouteRow[] {
  const rows: RouteRow[] = [];
  for (const d of dests) {
    d.carriers.forEach((carrier, idx) => {
      const key = `${origin}-${d.iata}-${carrier}`;
      const h = hash(key);
      const airline = AIRLINES.find((a) => a.iata === carrier)!;
      const slot = DEPARTURE_SLOTS[(h + idx * 3) % DEPARTURE_SLOTS.length];
      const flightNo =
        carrier === "2A" || carrier === "6E"
          ? `${carrier}${100 + (h % 800)}`
          : `${carrier}${100 + (h % 900)}`;
      const aircraft = airline.aircraft[h % airline.aircraft.length];
      const jitter = (h % 36) - 10; // -10..+25 minutes
      const durationMinutes = Math.max(45, d.durationMin + jitter);
      const factor = PRICE_FACTOR[carrier] ?? 1;
      const priceJitter = 1 + ((h % 21) - 10) / 100; // ±10%
      const basePriceUSD =
        Math.round(d.basePriceUSD * factor * priceJitter);
      rows.push({
        originIata: origin,
        destinationIata: d.iata,
        airlineIata: carrier,
        flightNumber: flightNo,
        departureTimeLocal: slot,
        durationMinutes,
        aircraft,
        basePriceUSD,
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
        countryId: countryMap.get(a.countryCode)!,
      },
    });
  }

  // Airlines
  for (const a of AIRLINES) {
    await prisma.airline.create({
      data: { iata: a.iata, name: a.name, logo: `/airlines/${a.iata}.svg` },
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
