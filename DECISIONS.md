# Build decisions

Choices made while building the itinerly MVP from `CLAUDE.md`. Where the spec
was ambiguous, the tie-breaker was "consistent with onwardify's UX and
echoflights' visual style."

## Confirmed with the user up front

- **Project root: in-place.** The Next.js app lives directly in
  `/Users/kamalahmed/Code/itinerly/`; `CLAUDE.md` stays at the project root as
  the spec. `pnpm dev` runs from this folder.
- **PDF engine: `@react-pdf/renderer`.** Pure-JS, no system Chromium dependency
  (the spec offered this or Puppeteer).
- **Seed breadth: realistic per-airport.** DAC is seeded to ~60 destinations
  across all 18 carriers; CGP/ZYL/BZL are seeded only to their real Middle East
  routes (DXB, DOH, AUH, MCT, JED, RUH, SHJ, KWI).

## Database / deployment

- **Postgres everywhere.** SQLite was used for the initial scaffold but does
  not work on Vercel (ephemeral serverless filesystem). The schema is now
  `provider = "postgresql"`. Local dev runs Postgres via the bundled
  `docker-compose.yml` or `brew install postgresql@16`; CI uses a GitHub
  Actions Postgres service; prod uses Vercel Postgres / Neon / Supabase. The
  connection string is the only thing that changes.
- **Migrations run on every Vercel build** via `prisma migrate deploy && next build`.
  Idempotent — already-applied migrations are skipped. Seeding is **not** in
  the build (would wipe data); it must be run once manually after the first
  deploy.
- **Rate limiting via Upstash Redis** (`@upstash/ratelimit`) on the public
  search APIs. Picked over Vercel WAF (needs Pro plan, not in repo) and
  in-memory limiters (unreliable across serverless instances). Gracefully
  no-ops when Upstash env vars are absent.

## Stack / tooling

- **Next.js pinned to 14.2.x.** `create-next-app@latest` installs Next 16; the
  brief explicitly says Next.js 14, so the project is pinned to 14 (which also
  gives the React 18 / Tailwind 3 combo that the classic shadcn/ui expects).
- **pnpm via `corepack`.** pnpm was not installed; `corepack enable pnpm` ships
  with Node 22 and avoids a global npm install. `pnpm-workspace.yaml` allows
  build scripts for `@prisma/*`, `esbuild`, `unrs-resolver`, `sharp`.
- **shadcn/ui components are vendored manually.** The current shadcn CLI (4.x)
  targets Tailwind 4 / base-ui and fights the Tailwind 3 setup. The needed
  components (button, input, card, select, popover, dialog, sheet, tabs,
  tooltip, command, calendar, form, etc.) are written by hand in
  `components/ui/` in the classic Radix style — same output, no CLI friction.
- **`lib/pdf.tsx`** (not `.ts`) because it renders React components for
  `@react-pdf/renderer`.

## Data / providers

- **Provider default = chain.** Per the user's brief, the default search path
  is the `searchWithChain` function in `lib/providers/index.ts`: SearchCache
  (15-min TTL) → `mock` → `amadeus` fallback (only when `AMADEUS_CLIENT_ID` /
  `AMADEUS_CLIENT_SECRET` are set). Setting `FLIGHT_PROVIDER` to `amadeus` or
  `duffel` forces that single provider instead of the chain (still cached).
- **`SearchCache` key** = `sha256(origin|destination|departDate|returnDate|
  tripType|cabin|pax|preferredAirline|nonStopOnly)`.
- **Mock routes are direct-only**, as the spec specifies. Long-haul European /
  North American / Oceania / African routes are seeded as synthetic "direct"
  entries on a believable carrier (Gulf carriers, Turkish, etc.) — echoflights
  does the same thing with its seeded DB. This is fine for a visa-itinerary
  preview; it is not a real schedule feed.
- **Round-trip return legs are synthesized.** The seed table is outbound-only
  (Bangladesh → destination). For a round trip, the mock provider reverses a
  forward route of the same carrier to produce the return leg (swapped
  origin/destination, a derived departure slot, flight number + 1).
- **Amadeus uses the TEST host by default** (`test.api.amadeus.com`), overridable
  via `AMADEUS_HOSTNAME`. Amadeus prices are requested in USD.
- **Duffel amounts pass through as-is.** Duffel test offers are often priced in
  GBP; FX normalization is out of MVP scope, so `totalPriceUSD` carries the
  provider's amount unchanged when `FLIGHT_PROVIDER=duffel`.

## UX / product

- **Booking route param is the booking id, not an offer id.** Search offers are
  ephemeral, so "Select" creates a `Booking` draft (status `pending`, PNR
  generated immediately, `offerJson` snapshotted) and routes to
  `/booking/[id]`. The spec's `[offerId]` folder is therefore `[id]`. This is
  the "server-rendered lookup" option the spec allows and it survives refresh.
- **Passengers are added on the booking form**, starting with one and
  add/remove as needed — the search pax count is not carried into the offer.
- **Payment is a mock screen**: no network call, 1.5s delay, then confirmation.
  itinerly is positioned as free-for-now, so the screen says so.
- **Airline logos are branded IATA badges**, not bitmap files. `components/
  airline-logo.tsx` renders a deterministic colored badge with the IATA code.
  This avoids shipping/maintaining 18 logo assets and broken-image states. The
  seed still stores `/airlines/{iata}.svg` logo paths for when real assets land.
- **Disclaimer language**: every surface (footer, home, booking, PDF) states
  the document is "for visa application purposes only — not a confirmed airline
  booking." This matches both audited sites and the spec's configurable
  disclaimer.

## Bangladesh specifics

- **Currency**: `lib/currency.ts` hard-codes `USD_TO_BDT = 119`. Prices show USD
  primary with BDT alongside. A real FX API replaces this later.
- **Bengali**: `lib/i18n.ts` is a plain English→Bengali city-name map. Bengali
  names appear in tooltips on flight cards and on route landing pages. English
  remains the primary language.

## SEO

- **37 route landing pages** under `/flights/[slug]` (spec asked for ≥30),
  curated in `lib/routes.ts` with the echoflights slug convention
  (`dhaka-to-dubai-uae`). Each page is statically generated, server-renders the
  cheapest mock flight plus every carrier on the route, and links into a
  prefilled `/search`.
