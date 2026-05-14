import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Plane } from "lucide-react";
import { routesByRegion } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Popular flight routes from Dhaka",
  description:
    "Browse popular Bangladesh outbound flight routes from Dhaka — fares, carriers and itinerary documents for visa applications.",
  alternates: { canonical: "/flights" },
};

export default function FlightsIndexPage() {
  const grouped = routesByRegion();
  const regions = Object.keys(grouped);

  return (
    <div className="container py-8">
      <div className="mb-8 max-w-2xl">
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <Plane className="h-4 w-4" />
          Popular routes
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Flight routes from Dhaka
        </h1>
        <p className="mt-2 text-muted-foreground">
          Explore the most-searched Bangladesh outbound routes. Each route page
          shows the cheapest fare, every carrier that flies it, and a one-click
          path to generate an embassy-ready itinerary PDF.
        </p>
      </div>

      <div className="space-y-8">
        {regions.map((region) => (
          <section key={region}>
            <h2 className="mb-3 text-lg font-semibold">{region}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[region].map((r) => (
                <Link
                  key={r.slug}
                  href={`/flights/${r.slug}`}
                  className="group flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:border-primary hover:bg-accent"
                >
                  <div>
                    <p className="font-semibold">
                      Dhaka → {r.destinationCity}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.destinationCountry} · DAC–{r.destinationIata}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
