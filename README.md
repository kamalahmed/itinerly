# itinerly

Flight itinerary documents for visa applications — a Bangladesh-focused flight
search frontend that generates an embassy-acceptable itinerary PDF. itinerly
produces a **sample itinerary document, not a confirmed airline booking**.

Built per the MVP spec in [`CLAUDE.md`](./CLAUDE.md). Design decisions are
recorded in [`DECISIONS.md`](./DECISIONS.md).

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS 3** + hand-vendored **shadcn/ui** components (Radix)
- **Prisma** — SQLite for dev, Postgres for prod
- **@react-pdf/renderer** + **bwip-js** for the itinerary PDF + barcode
- **Vitest** for tests

## Quick start

```bash
corepack enable pnpm        # pnpm ships with Node 22 via corepack
pnpm install
cp .env.example .env        # defaults work out of the box (FLIGHT_PROVIDER=mock)
pnpm prisma migrate dev     # creates prisma/dev.db
pnpm prisma db seed         # seeds airports, airlines, ~200 routes
pnpm dev                    # http://localhost:3000
```

If you cloned a repo that already has migrations, run `pnpm prisma migrate dev`
then `pnpm prisma db seed` (or `pnpm db:reset` to wipe + reseed).

## Environment variables

See [`.env.example`](./.env.example). Summary:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Prisma connection string. Dev: `file:./dev.db`. |
| `FLIGHT_PROVIDER` | `mock` (default), `amadeus`, or `duffel`. See below. |
| `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` | Amadeus Self-Service OAuth credentials. |
| `AMADEUS_HOSTNAME` | `test.api.amadeus.com` (default) or `api.amadeus.com`. |
| `DUFFEL_API_KEY` | Duffel API token. |
| `NEXT_PUBLIC_BASE_URL` | Used for metadata / canonical URLs. |

## Flight data providers

Three providers implement the `FlightProvider` interface (`lib/providers/`):

- **`mock`** — seeded `SeededRoute` table (echoflights-style). Comprehensive
  Bangladesh outbound routes from DAC/CGP/ZYL/BZL across 18 carriers. Used by
  default and needs no credentials.
- **`amadeus`** — Amadeus Self-Service Flight Offers Search (OAuth client
  credentials). Defaults to the TEST host.
- **`duffel`** — Duffel API for real airline content.

### Default search chain

With `FLIGHT_PROVIDER=mock` (the default), the API route uses `searchWithChain`:

1. Serve from the `SearchCache` table if a fresh entry exists (15-minute TTL).
2. Try the `mock` provider. If it returns offers → cache + return.
3. Fall back to `amadeus` **only when `AMADEUS_CLIENT_ID` is set**.
4. Otherwise return no results.

Setting `FLIGHT_PROVIDER=amadeus` or `FLIGHT_PROVIDER=duffel` bypasses the chain
and forces that single provider (results are still cached). No UI code changes
when switching providers.

## Project layout

```
app/
  page.tsx                       Home (hero search form)
  search/page.tsx                Results — filter sidebar + streamed list
  flights/page.tsx               Popular routes index
  flights/[slug]/page.tsx        SEO landing pages (37 routes from Dhaka)
  booking/[id]/...               Passenger form → mock payment → confirmation
  booking/actions.ts             Server actions for the booking flow
  api/flights/search/route.ts    Search API (Zod-validated, uses the chain)
  api/airports/route.ts          Airport autocomplete
  api/booking/[id]/pdf/route.ts  Streams the itinerary PDF
components/                      UI: search form, flight card/list, etc.
  ui/                            shadcn/ui primitives
lib/
  providers/                     mock | amadeus | duffel + factory + chain
  types.ts, db.ts, normalize.ts  Core types and helpers
  currency.ts, i18n.ts           BDT pricing + Bengali city names
  pdf.tsx, pnr.ts, routes.ts     PDF rendering, PNR generation, SEO routes
prisma/
  schema.prisma, seed.ts         Schema + Bangladesh route seed
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the dev server at http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm test` | Run the Vitest suite |
| `pnpm seed` | Re-run the database seed |
| `pnpm db:reset` | Drop, re-migrate and re-seed the database |

## Notes

itinerly produces a flight itinerary document for visa-application purposes
only. It is not a real booking engine, no seat is ever purchased, and the
payment screen is a mock. Flight schedules from the `mock` provider are seeded
and indicative.
