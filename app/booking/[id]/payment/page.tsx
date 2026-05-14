import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getBooking } from "@/lib/booking";
import { BookingSummary } from "@/components/booking-summary";
import { PaymentForm } from "@/components/payment-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false },
};

export default async function BookingPaymentPage({
  params,
}: {
  params: { id: string };
}) {
  const booking = await getBooking(params.id);
  if (!booking) notFound();
  if (booking.passengers.length === 0) {
    redirect(`/booking/${booking.id}`);
  }

  return (
    <div className="container py-6">
      <div className="mb-5">
        <p className="text-sm text-muted-foreground">Step 2 of 3</p>
        <h1 className="text-2xl font-bold">Payment</h1>
        <p className="text-sm text-muted-foreground">
          {booking.passengers.length} passenger
          {booking.passengers.length === 1 ? "" : "s"} · PNR {booking.pnr}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <PaymentForm bookingId={booking.id} />
        <div className="lg:order-last">
          <BookingSummary offer={booking.offer} />
        </div>
      </div>
    </div>
  );
}
