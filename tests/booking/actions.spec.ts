import { describe, it, expect, afterAll } from "vitest";
import prisma from "@/lib/db";
import {
  createBookingDraft,
  savePassengers,
  confirmBooking,
} from "@/app/booking/actions";
import { generatePnr } from "@/lib/pnr";
import { makeOffer } from "../fixtures";
import type { PassengerDetails } from "@/lib/types";

const created: string[] = [];

const PASSENGERS: PassengerDetails[] = [
  {
    title: "Mr",
    fullName: "TEST USER",
    dob: "1990-01-01",
    nationality: "Bangladeshi",
    passportNumber: "A1234567",
    passportExpiry: "2030-01-01",
  },
];

/** next/navigation `redirect()` throws an error whose digest carries the URL. */
function redirectPathOf(err: unknown): string {
  const digest = (err as { digest?: string }).digest ?? "";
  return digest.split(";").find((p) => p.startsWith("/")) ?? "";
}

async function expectRedirect(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (err) {
    const path = redirectPathOf(err);
    expect(path).not.toBe("");
    return path;
  }
  throw new Error("expected the action to redirect");
}

async function seedBooking(status: string, passengers: PassengerDetails[]) {
  const b = await prisma.booking.create({
    data: {
      pnr: generatePnr(),
      passengerJson: JSON.stringify(passengers),
      offerJson: JSON.stringify(makeOffer()),
      status,
    },
  });
  created.push(b.id);
  return b;
}

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { id: { in: created } } });
});

describe("createBookingDraft", () => {
  it("creates a pending booking with a PNR and redirects to the passenger form", async () => {
    const offer = makeOffer();
    const path = await expectRedirect(() => createBookingDraft(offer));

    const id = path.split("/")[2];
    created.push(id);

    const booking = await prisma.booking.findUnique({ where: { id } });
    expect(booking).not.toBeNull();
    expect(booking!.status).toBe("pending");
    expect(booking!.pnr).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(path).toBe(`/booking/${id}`);

    const snapshot = JSON.parse(booking!.offerJson);
    expect(snapshot.id).toBe(offer.id);
    expect(JSON.parse(booking!.passengerJson)).toEqual([]);
  });
});

describe("savePassengers", () => {
  it("persists passenger details and redirects to payment", async () => {
    const booking = await seedBooking("pending", []);
    const path = await expectRedirect(() =>
      savePassengers(booking.id, PASSENGERS)
    );
    expect(path).toBe(`/booking/${booking.id}/payment`);

    const updated = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    expect(JSON.parse(updated!.passengerJson)).toEqual(PASSENGERS);
  });
});

describe("confirmBooking", () => {
  it("marks the booking paid and redirects to confirmation", async () => {
    const booking = await seedBooking("pending", PASSENGERS);
    const path = await expectRedirect(() => confirmBooking(booking.id));
    expect(path).toBe(`/booking/${booking.id}/confirmation`);

    const updated = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    expect(updated!.status).toBe("paid_fake");
  });
});
