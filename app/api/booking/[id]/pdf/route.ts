import { NextRequest, NextResponse } from "next/server";
import { getBooking } from "@/lib/booking";
import { renderTicketPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const booking = await getBooking(params.id);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.passengers.length === 0) {
    return NextResponse.json(
      { error: "Add passenger details before downloading the itinerary" },
      { status: 409 }
    );
  }

  const pdf = await renderTicketPdf(
    booking.offer,
    booking.passengers,
    booking.pnr
  );

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="itinerly-${booking.pnr}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
