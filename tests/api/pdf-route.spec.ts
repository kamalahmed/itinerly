import { describe, it, expect, afterAll } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { GET } from "@/app/api/booking/[id]/pdf/route";
import { generatePnr } from "@/lib/pnr";
import { makeOffer } from "../fixtures";
import type { PassengerDetails } from "@/lib/types";

const created: string[] = [];

const PASSENGER: PassengerDetails = {
  title: "Mr",
  fullName: "TEST USER",
  dob: "1990-01-01",
  nationality: "Bangladeshi",
  passportNumber: "A1234567",
  passportExpiry: "2030-01-01",
};

async function makeBooking(passengers: PassengerDetails[]) {
  const b = await prisma.booking.create({
    data: {
      pnr: generatePnr(),
      passengerJson: JSON.stringify(passengers),
      offerJson: JSON.stringify(makeOffer()),
      status: passengers.length ? "paid_fake" : "pending",
    },
  });
  created.push(b.id);
  return b;
}

const dummyReq = new NextRequest("http://localhost/api/booking/x/pdf");

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { id: { in: created } } });
});

describe("GET /api/booking/[id]/pdf", () => {
  it("streams a PDF for a booking with passengers", async () => {
    const b = await makeBooking([PASSENGER]);
    const res = await GET(dummyReq, { params: { id: b.id } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain(b.pnr);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("returns 404 for an unknown booking id", async () => {
    const res = await GET(dummyReq, { params: { id: "does-not-exist" } });
    expect(res.status).toBe(404);
  });

  it("returns 409 when the booking has no passengers", async () => {
    const b = await makeBooking([]);
    const res = await GET(dummyReq, { params: { id: b.id } });
    expect(res.status).toBe(409);
  });
});
