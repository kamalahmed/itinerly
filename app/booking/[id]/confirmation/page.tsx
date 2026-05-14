import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Download, Plane } from "lucide-react";
import { getBooking } from "@/lib/booking";
import { BookingSummary } from "@/components/booking-summary";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirmation",
  robots: { index: false },
};

export default async function BookingConfirmationPage({
  params,
}: {
  params: { id: string };
}) {
  const booking = await getBooking(params.id);
  if (!booking) notFound();
  if (booking.status === "pending") {
    redirect(`/booking/${booking.id}`);
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="rounded-xl border bg-card p-6 text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold">Itinerary generated</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your flight itinerary document is ready to download.
        </p>
        <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2">
          <span className="text-sm text-muted-foreground">Booking reference</span>
          <span className="font-mono text-lg font-bold tracking-widest">
            {booking.pnr}
          </span>
        </div>
        <div className="mt-5">
          <Button asChild size="lg">
            <a href={`/api/booking/${booking.id}/pdf`}>
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_320px]">
        <div className="rounded-xl border bg-card p-4">
          <p className="flex items-center gap-2 font-semibold">
            <Plane className="h-4 w-4 text-primary" />
            Passengers
          </p>
          <Separator className="my-3" />
          <ul className="space-y-2 text-sm">
            {booking.passengers.map((p, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {p.title} {p.fullName}
                </span>
                <span className="text-muted-foreground">
                  {p.nationality} · {p.passportNumber}
                </span>
              </li>
            ))}
          </ul>
          <Separator className="my-3" />
          <p className="text-xs text-muted-foreground">
            This document is a flight itinerary for visa application purposes
            only — it is not a confirmed airline booking and no seat has been
            purchased.
          </p>
        </div>
        <BookingSummary offer={booking.offer} />
      </div>

      <div className="mt-6 text-center">
        <Button asChild variant="outline">
          <Link href="/flights">Browse more routes from Dhaka</Link>
        </Button>
      </div>
    </div>
  );
}
