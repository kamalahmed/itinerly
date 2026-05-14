import Link from "next/link";
import {
  FileCheck2,
  Search as SearchIcon,
  CreditCard,
  Download,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { SEO_ROUTES } from "@/lib/routes";
import { SearchForm } from "@/components/search-form";

const STEPS = [
  {
    icon: SearchIcon,
    title: "Search a route",
    body: "Pick your origin, destination, dates and passengers from Bangladesh's busiest outbound routes.",
  },
  {
    icon: FileCheck2,
    title: "Choose a flight",
    body: "Compare carriers, times and fares — then select the itinerary that fits your visa application.",
  },
  {
    icon: CreditCard,
    title: "Add passengers",
    body: "Enter traveller details exactly as they appear in the passport. itinerly is free while in beta.",
  },
  {
    icon: Download,
    title: "Download the PDF",
    body: "Get an embassy-style itinerary document with a booking reference and barcode in seconds.",
  },
];

export default function HomePage() {
  const popular = SEO_ROUTES.slice(0, 8);

  return (
    <div>
      <section className="border-b bg-gradient-to-b from-accent/60 to-background">
        <div className="container py-10 sm:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Embassy-style flight itineraries for visa applications
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Flight itineraries for your{" "}
              <span className="text-primary">visa application</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              itinerly generates a believable, embassy-ready flight itinerary
              PDF for Bangladeshi travellers and agencies — without booking a
              real ticket. Free while in beta.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-4xl">
            <SearchForm />
          </div>
        </div>
      </section>

      <section className="container py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight">
          How itinerly works
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-xl border bg-card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                Step {i + 1}
              </p>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="container py-12">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold tracking-tight">
              Popular routes from Dhaka
            </h2>
            <Link
              href="/flights"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              All routes
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((r) => (
              <Link
                key={r.slug}
                href={`/flights/${r.slug}`}
                className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary hover:bg-accent"
              >
                <p className="font-semibold">Dhaka → {r.destinationCity}</p>
                <p className="text-xs text-muted-foreground">
                  {r.destinationCountry} · DAC–{r.destinationIata}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-10">
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Please note:</strong> itinerly
            produces a flight itinerary document for visa-application purposes
            only. It is not a confirmed airline booking and no seat is
            purchased. Always confirm your embassy&apos;s requirements before
            submitting any document.
          </p>
        </div>
      </section>
    </div>
  );
}
