"use server";

import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import { generatePnr } from "@/lib/pnr";
import type { FlightOffer, PassengerDetails } from "@/lib/types";

/** Create a booking draft from a selected offer and go to the passenger form. */
export async function createBookingDraft(offer: FlightOffer) {
  // Ensure a unique PNR (collisions are astronomically unlikely, but cheap to guard).
  let pnr = generatePnr();
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.booking.findUnique({ where: { pnr } });
    if (!existing) break;
    pnr = generatePnr();
  }

  const booking = await prisma.booking.create({
    data: {
      pnr,
      passengerJson: "[]",
      offerJson: JSON.stringify(offer),
      status: "pending",
    },
  });

  redirect(`/booking/${booking.id}`);
}

/** Persist passenger details and advance to the mock payment screen. */
export async function savePassengers(
  id: string,
  passengers: PassengerDetails[]
) {
  await prisma.booking.update({
    where: { id },
    data: { passengerJson: JSON.stringify(passengers) },
  });
  redirect(`/booking/${id}/payment`);
}

/** Mark the (mock) payment complete and advance to confirmation. */
export async function confirmBooking(id: string) {
  await prisma.booking.update({
    where: { id },
    data: { status: "paid_fake" },
  });
  redirect(`/booking/${id}/confirmation`);
}
