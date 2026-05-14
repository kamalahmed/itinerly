import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { addDays, format } from "date-fns";
import { ArrowRight, Plane, Clock } from "lucide-react";
import { SEO_ROUTES, getSeoRoute } from "@/lib/routes";
import { mock } from "@/lib/providers/mock";
import { getAirport } from "@/lib/airports";
import type { FlightOffer, SearchQuery } from "@/lib/types";
import { formatDuration, timeOf } from "@/lib/normalize";
import { formatUSD, formatBDT, usdToBdt } from "@/lib/currency";
import { toSearchParams } from "@/lib/search-schema";
import { bnCity } from "@/lib/i18n";
import { AirlineLogo } from "@/components/airline-logo";
import { FlightCard } from "@/components/flight-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-static";
export const revalidate = 3600;

export function generateStaticParams() {
  return SEO_ROUTES.map((r) => ({ slug: r.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const route = getSeoRoute(params.slug);
  if (!route) return {};
  const title = `Dhaka to ${route.destinationCity} flights (DAC–${route.destinationIata})`;
  return {
    title,
    description: `Compare carriers, fares and schedules for flights from Dhaka to ${route.destinationCity}, ${route.destinationCountry}. Generate a flight itinerary PDF for your visa application.`,
    alternates: { canonical: `/flights/${route.slug}` },
    openGraph: { title, type: "website" },
  };
}

async function loadRouteOffers(route: {
  originIata: string;
  destinationIata: string;
}): Promise<{ offers: FlightOffer[]; departDate: string }> {
  const departDate = format(addDays(new Date(), 21), "yyyy-MM-dd");
  const query: SearchQuery = {
    origin: route.originIata,
    destination: route.destinationIata,
    departDate,
    cabin: "economy",
    adults: 1,
    children: 0,
    infants: 0,
    tripType: "one_way",
  };
  const offers = await mock.searchOffers(query);
  return { offers, departDate };
}

export default async function RouteLandingPage({
  params,
}: {
  params: { slug: string };
}) {
  const route = getSeoRoute(params.slug);
  if (!route) notFound();

  const [{ offers, departDate }, destAirport] = await Promise.all([
    loadRouteOffers(route),
    getAirport(route.destinationIata),
  ]);

  const cheapest = offers[0];
  const bn = bnCity(route.destinationCity);
  const searchHref = `/search?${toSearchParams({
    origin: route.originIata,
    destination: route.destinationIata,
    departDate,
    cabin: "economy",
    adults: 1,
    children: 0,
    infants: 0,
    tripType: "one_way",
  })}`;

  return (
    <div className="container py-8">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/flights" className="hover:text-foreground">
          Routes
        </Link>{" "}
        / <span className="text-foreground">Dhaka → {route.destinationCity}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Plane className="h-4 w-4" />
            {route.region}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Dhaka to {route.destinationCity} flights
          </h1>
          <p className="mt-1 text-muted-foreground">
            DAC → {route.destinationIata} ·{" "}
            {destAirport?.name ?? route.destinationCity},{" "}
            {route.destinationCountry}
            {bn ? ` · ${bn}` : ""}
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {route.blurb} The fares below come from itinerly&apos;s seeded route
            data and are indicative — use them to build a flight itinerary
            document for your visa application.
          </p>

          {cheapest ? (
            <div className="mt-6">
              <h2 className="mb-2 text-lg font-semibold">
                Cheapest flight on this route
              </h2>
              <FlightCard offer={cheapest} />
            </div>
          ) : (
            <p className="mt-6 rounded-xl border bg-card p-6 text-sm text-muted-foreground">
              No seeded flights for this route yet.
            </p>
          )}

          {offers.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">
                All carriers on Dhaka → {route.destinationCity}
              </h2>
              <div className="overflow-hidden rounded-xl border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Airline</th>
                      <th className="px-4 py-2 font-medium">Flight</th>
                      <th className="px-4 py-2 font-medium">Departs</th>
                      <th className="px-4 py-2 font-medium">Duration</th>
                      <th className="px-4 py-2 text-right font-medium">
                        From
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((o) => {
                      const seg = o.outboundSegments[0];
                      return (
                        <tr key={o.id} className="border-t">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <AirlineLogo
                                iata={seg.carrier.iata}
                                name={seg.carrier.name}
                                size="sm"
                              />
                              <span>{seg.carrier.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {seg.flightNumber}
                          </td>
                          <td className="px-4 py-2">
                            {timeOf(seg.departureLocal)}
                          </td>
                          <td className="px-4 py-2">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDuration(seg.durationMinutes)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="font-semibold">
                              {formatUSD(o.totalPriceUSD)}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {formatBDT(usdToBdt(o.totalPriceUSD))}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <aside className="lg:order-last">
          <div className="sticky top-20 rounded-xl border bg-card p-5">
            <Badge variant="secondary">Search this route</Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              Pick your own dates and passengers to generate an itinerary
              document for Dhaka → {route.destinationCity}.
            </p>
            {cheapest && (
              <p className="mt-3 text-sm">
                Fares from{" "}
                <span className="text-lg font-bold">
                  {formatUSD(cheapest.totalPriceUSD)}
                </span>
              </p>
            )}
            <Button asChild className="mt-4 w-full">
              <Link href={searchHref}>
                Search this route
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              itinerly produces a sample itinerary PDF for visa applications —
              not a confirmed airline booking.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
