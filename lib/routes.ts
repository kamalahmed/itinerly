/**
 * Curated SEO landing routes from Dhaka. Slug convention matches echoflights:
 * "dhaka-to-dubai-uae". These power /flights and /flights/[slug].
 */
export interface SeoRoute {
  slug: string;
  originIata: string; // always DAC for now
  destinationIata: string;
  destinationCity: string;
  destinationCountry: string;
  region: string;
  blurb: string;
}

const O = "DAC";

export const SEO_ROUTES: SeoRoute[] = [
  // Middle East
  { slug: "dhaka-to-dubai-uae", originIata: O, destinationIata: "DXB", destinationCity: "Dubai", destinationCountry: "United Arab Emirates", region: "Middle East", blurb: "One of the busiest routes for Bangladeshi travellers and a common visa-application corridor." },
  { slug: "dhaka-to-abu-dhabi-uae", originIata: O, destinationIata: "AUH", destinationCity: "Abu Dhabi", destinationCountry: "United Arab Emirates", region: "Middle East", blurb: "Direct flights to the UAE capital, served by Etihad and Bangladeshi carriers." },
  { slug: "dhaka-to-sharjah-uae", originIata: O, destinationIata: "SHJ", destinationCity: "Sharjah", destinationCountry: "United Arab Emirates", region: "Middle East", blurb: "A popular low-cost gateway into the Emirates." },
  { slug: "dhaka-to-doha-qatar", originIata: O, destinationIata: "DOH", destinationCity: "Doha", destinationCountry: "Qatar", region: "Middle East", blurb: "Qatar Airways and Biman connect Dhaka with Hamad International." },
  { slug: "dhaka-to-muscat-oman", originIata: O, destinationIata: "MCT", destinationCity: "Muscat", destinationCountry: "Oman", region: "Middle East", blurb: "A key route for Bangladeshi workers and visitors to Oman." },
  { slug: "dhaka-to-bahrain", originIata: O, destinationIata: "BAH", destinationCity: "Manama", destinationCountry: "Bahrain", region: "Middle East", blurb: "Gulf Air and Biman serve the Dhaka–Manama corridor." },
  { slug: "dhaka-to-kuwait", originIata: O, destinationIata: "KWI", destinationCity: "Kuwait City", destinationCountry: "Kuwait", region: "Middle East", blurb: "Direct services to Kuwait International Airport." },
  { slug: "dhaka-to-riyadh-saudi-arabia", originIata: O, destinationIata: "RUH", destinationCity: "Riyadh", destinationCountry: "Saudi Arabia", region: "Middle East", blurb: "Saudia and Bangladeshi carriers fly Dhaka to the Saudi capital." },
  { slug: "dhaka-to-jeddah-saudi-arabia", originIata: O, destinationIata: "JED", destinationCity: "Jeddah", destinationCountry: "Saudi Arabia", region: "Middle East", blurb: "A major route, especially for Umrah and Hajj travellers." },
  { slug: "dhaka-to-dammam-saudi-arabia", originIata: O, destinationIata: "DMM", destinationCity: "Dammam", destinationCountry: "Saudi Arabia", region: "Middle East", blurb: "Direct flights to Saudi Arabia's Eastern Province." },
  { slug: "dhaka-to-medina-saudi-arabia", originIata: O, destinationIata: "MED", destinationCity: "Medina", destinationCountry: "Saudi Arabia", region: "Middle East", blurb: "Popular for pilgrimage travel to the holy city of Medina." },
  // South Asia
  { slug: "dhaka-to-kolkata-india", originIata: O, destinationIata: "CCU", destinationCity: "Kolkata", destinationCountry: "India", region: "South Asia", blurb: "The shortest international hop from Dhaka — under an hour in the air." },
  { slug: "dhaka-to-delhi-india", originIata: O, destinationIata: "DEL", destinationCity: "New Delhi", destinationCountry: "India", region: "South Asia", blurb: "Multiple daily flights connect Dhaka with the Indian capital." },
  { slug: "dhaka-to-mumbai-india", originIata: O, destinationIata: "BOM", destinationCity: "Mumbai", destinationCountry: "India", region: "South Asia", blurb: "Direct flights to India's financial hub." },
  { slug: "dhaka-to-chennai-india", originIata: O, destinationIata: "MAA", destinationCity: "Chennai", destinationCountry: "India", region: "South Asia", blurb: "A common route for medical and education travel." },
  { slug: "dhaka-to-bengaluru-india", originIata: O, destinationIata: "BLR", destinationCity: "Bengaluru", destinationCountry: "India", region: "South Asia", blurb: "Connecting Dhaka with India's technology capital." },
  { slug: "dhaka-to-kathmandu-nepal", originIata: O, destinationIata: "KTM", destinationCity: "Kathmandu", destinationCountry: "Nepal", region: "South Asia", blurb: "A scenic short-haul route to Nepal." },
  { slug: "dhaka-to-colombo-sri-lanka", originIata: O, destinationIata: "CMB", destinationCity: "Colombo", destinationCountry: "Sri Lanka", region: "South Asia", blurb: "SriLankan Airlines and Biman serve this route." },
  { slug: "dhaka-to-male-maldives", originIata: O, destinationIata: "MLE", destinationCity: "Malé", destinationCountry: "Maldives", region: "South Asia", blurb: "Direct flights to the Maldives for leisure and work travel." },
  // Southeast Asia
  { slug: "dhaka-to-bangkok-thailand", originIata: O, destinationIata: "BKK", destinationCity: "Bangkok", destinationCountry: "Thailand", region: "Southeast Asia", blurb: "A heavily travelled route for tourism, medical care and business." },
  { slug: "dhaka-to-kuala-lumpur-malaysia", originIata: O, destinationIata: "KUL", destinationCity: "Kuala Lumpur", destinationCountry: "Malaysia", region: "Southeast Asia", blurb: "Several carriers compete on the Dhaka–KL route." },
  { slug: "dhaka-to-singapore", originIata: O, destinationIata: "SIN", destinationCity: "Singapore", destinationCountry: "Singapore", region: "Southeast Asia", blurb: "Biman and Singapore Airlines connect the two cities." },
  { slug: "dhaka-to-jakarta-indonesia", originIata: O, destinationIata: "CGK", destinationCity: "Jakarta", destinationCountry: "Indonesia", region: "Southeast Asia", blurb: "Connecting Dhaka with the Indonesian capital." },
  { slug: "dhaka-to-yangon-myanmar", originIata: O, destinationIata: "RGN", destinationCity: "Yangon", destinationCountry: "Myanmar", region: "Southeast Asia", blurb: "A short regional hop to Myanmar." },
  { slug: "dhaka-to-manila-philippines", originIata: O, destinationIata: "MNL", destinationCity: "Manila", destinationCountry: "Philippines", region: "Southeast Asia", blurb: "Direct service to the Philippine capital." },
  // East Asia
  { slug: "dhaka-to-hong-kong", originIata: O, destinationIata: "HKG", destinationCity: "Hong Kong", destinationCountry: "Hong Kong", region: "East Asia", blurb: "Cathay Pacific and Biman serve this trade-heavy route." },
  { slug: "dhaka-to-guangzhou-china", originIata: O, destinationIata: "CAN", destinationCity: "Guangzhou", destinationCountry: "China", region: "East Asia", blurb: "A key route for trade between Bangladesh and southern China." },
  { slug: "dhaka-to-tokyo-japan", originIata: O, destinationIata: "NRT", destinationCity: "Tokyo", destinationCountry: "Japan", region: "East Asia", blurb: "Biman operates direct flights between Dhaka and Tokyo Narita." },
  { slug: "dhaka-to-seoul-south-korea", originIata: O, destinationIata: "ICN", destinationCity: "Seoul", destinationCountry: "South Korea", region: "East Asia", blurb: "Connecting Dhaka with Incheon International." },
  // Europe
  { slug: "dhaka-to-london-uk", originIata: O, destinationIata: "LHR", destinationCity: "London", destinationCountry: "United Kingdom", region: "Europe", blurb: "A flagship long-haul route with strong demand from the Bangladeshi diaspora." },
  { slug: "dhaka-to-manchester-uk", originIata: O, destinationIata: "MAN", destinationCity: "Manchester", destinationCountry: "United Kingdom", region: "Europe", blurb: "Direct service to northern England." },
  { slug: "dhaka-to-istanbul-turkey", originIata: O, destinationIata: "IST", destinationCity: "Istanbul", destinationCountry: "Türkiye", region: "Europe", blurb: "Turkish Airlines connects Dhaka with its Istanbul hub." },
  { slug: "dhaka-to-paris-france", originIata: O, destinationIata: "CDG", destinationCity: "Paris", destinationCountry: "France", region: "Europe", blurb: "Convenient one-stop connections to Paris Charles de Gaulle." },
  { slug: "dhaka-to-frankfurt-germany", originIata: O, destinationIata: "FRA", destinationCity: "Frankfurt", destinationCountry: "Germany", region: "Europe", blurb: "A common gateway into Germany and the rest of Europe." },
  { slug: "dhaka-to-rome-italy", originIata: O, destinationIata: "FCO", destinationCity: "Rome", destinationCountry: "Italy", region: "Europe", blurb: "Popular with the large Bangladeshi community in Italy." },
  // North America
  { slug: "dhaka-to-new-york-usa", originIata: O, destinationIata: "JFK", destinationCity: "New York", destinationCountry: "United States", region: "North America", blurb: "One-stop connections to New York JFK via the Gulf and Istanbul." },
  { slug: "dhaka-to-toronto-canada", originIata: O, destinationIata: "YYZ", destinationCity: "Toronto", destinationCountry: "Canada", region: "North America", blurb: "A major route for the Bangladeshi-Canadian community." },
];

export function getSeoRoute(slug: string): SeoRoute | undefined {
  return SEO_ROUTES.find((r) => r.slug === slug);
}

/** Group routes by region for the /flights index. */
export function routesByRegion(): Record<string, SeoRoute[]> {
  const out: Record<string, SeoRoute[]> = {};
  for (const r of SEO_ROUTES) {
    (out[r.region] ??= []).push(r);
  }
  return out;
}
