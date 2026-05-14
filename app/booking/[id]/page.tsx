import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBooking } from "@/lib/booking";
import { BookingSummary } from "@/components/booking-summary";
import { PassengerForm } from "@/components/passenger-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Passenger details",
  robots: { index: false },
};

export default async function BookingPassengerPage({
  params,
}: {
  params: { id: string };
}) {
  const booking = await getBooking(params.id);
  if (!booking) notFound();

  return (
    <div className="container py-6">
      <div className="mb-5">
        <p className="text-sm text-muted-foreground">Step 1 of 3</p>
        <h1 className="text-2xl font-bold">Passenger details</h1>
        <p className="text-sm text-muted-foreground">
          Enter each traveller&apos;s details exactly as they appear in the
          passport.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <PassengerForm bookingId={booking.id} />
        <div className="lg:order-last">
          <BookingSummary offer={booking.offer} />
        </div>
      </div>
    </div>
  );
}
