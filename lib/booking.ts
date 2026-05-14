import prisma from "@/lib/db";
import type { FlightOffer, PassengerDetails } from "@/lib/types";

export interface LoadedBooking {
  id: string;
  pnr: string;
  status: string;
  createdAt: Date;
  offer: FlightOffer;
  passengers: PassengerDetails[];
  pdfPath: string | null;
}

/** Load a booking and parse its JSON blobs, or null if not found. */
export async function getBooking(id: string): Promise<LoadedBooking | null> {
  const row = await prisma.booking.findUnique({ where: { id } });
  if (!row) return null;
  let offer: FlightOffer;
  let passengers: PassengerDetails[];
  try {
    offer = JSON.parse(row.offerJson) as FlightOffer;
    passengers = JSON.parse(row.passengerJson) as PassengerDetails[];
  } catch {
    return null;
  }
  return {
    id: row.id,
    pnr: row.pnr,
    status: row.status,
    createdAt: row.createdAt,
    offer,
    passengers,
    pdfPath: row.pdfPath,
  };
}
