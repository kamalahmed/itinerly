import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How itinerly generates a flight itinerary PDF for your visa application — search, select, add passengers and download.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS = [
  {
    title: "Search a route",
    body: "Choose your origin and destination, travel dates, cabin and the number of passengers. itinerly covers the busiest outbound routes from Dhaka, Chittagong, Sylhet and Barishal.",
  },
  {
    title: "Compare and select a flight",
    body: "Browse every carrier on the route with realistic schedules and fares. Filter by stops, airline, departure time or price, then select the flight that suits your application.",
  },
  {
    title: "Enter passenger details",
    body: "Add each traveller exactly as their name appears in the passport, along with date of birth, nationality, passport number and expiry. Multiple passengers are supported on one itinerary.",
  },
  {
    title: "Complete the (mock) payment",
    body: "itinerly is free while in beta. The payment screen is a placeholder — no card is charged and nothing is sent over the network.",
  },
  {
    title: "Download your itinerary PDF",
    body: "You get an embassy-style itinerary document with a booking reference, passenger list, full segment details, a fare summary and a barcode — ready to attach to your visa application.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold tracking-tight">How itinerly works</h1>
      <p className="mt-2 text-muted-foreground">
        itinerly turns a flight search into an embassy-acceptable itinerary
        document in under a minute. Here is the full flow.
      </p>

      <ol className="mt-8 space-y-5">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {i + 1}
            </span>
            <div>
              <h2 className="font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-xl border bg-muted/40 p-5 text-sm text-muted-foreground">
        <strong className="text-foreground">A note on what this is.</strong>{" "}
        itinerly produces a flight itinerary document for visa-application
        purposes only. It is not a confirmed airline booking, no seat is
        purchased, and schedules are indicative. Always check your
        embassy&apos;s specific requirements before submitting any document.
      </div>

      <div className="mt-8">
        <Button asChild size="lg">
          <Link href="/search">
            Start a flight search
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
