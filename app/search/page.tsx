import { Suspense } from "react";
import type { Metadata } from "next";
import { parseSearchParams } from "@/lib/search-schema";
import { searchWithChain } from "@/lib/providers";
import { getAirport } from "@/lib/airports";
import type { SearchQuery } from "@/lib/types";
import { SearchForm, type SearchFormInitial } from "@/components/search-form";
import { FlightList } from "@/components/flight-list";
import { FlightListSkeleton } from "@/components/flight-list-skeleton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search flights",
  description: "Search Bangladesh outbound flights for your visa itinerary.",
};

async function Results({ query }: { query: SearchQuery }) {
  let offers: Awaited<ReturnType<typeof searchWithChain>>["offers"] = [];
  let source = "none";
  try {
    ({ offers, source } = await searchWithChain(query));
  } catch (err) {
    // A DB outage/timeout shouldn't hang or crash the page — show a clear,
    // retryable message instead.
    console.error("[search] results failed:", err);
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="font-semibold">Search is temporarily unavailable.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We couldn&apos;t reach the flight database. Please try again in a
          moment.
        </p>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="font-semibold">No flights found for this route.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try a different date, or pick one of the popular routes from Dhaka.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        Showing results from the{" "}
        <span className="font-medium">{source}</span> provider.
      </p>
      <FlightList offers={offers} />
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = parseSearchParams(searchParams);

  let initial: SearchFormInitial | undefined;
  if (query) {
    const [origin, destination] = await Promise.all([
      getAirport(query.origin),
      getAirport(query.destination),
    ]);
    initial = {
      origin: origin ?? undefined,
      destination: destination ?? undefined,
      departDate: query.departDate,
      returnDate: query.returnDate,
      cabin: query.cabin,
      adults: query.adults,
      children: query.children,
      infants: query.infants,
      tripType: query.tripType,
    };
  }

  return (
    <div className="container space-y-6 py-6">
      <SearchForm initial={initial} />

      {!query ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="font-semibold">Start your flight search</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick an origin, destination and date above to see available
            flights.
          </p>
        </div>
      ) : (
        <Suspense
          key={JSON.stringify(query)}
          fallback={<FlightListSkeleton />}
        >
          <Results query={query} />
        </Suspense>
      )}
    </div>
  );
}
