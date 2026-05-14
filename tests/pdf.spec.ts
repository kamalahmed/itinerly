import { describe, it, expect } from "vitest";
import { renderTicketPdf } from "@/lib/pdf";
import { makeOffer, makeSegment, DXB, DAC, BG } from "./fixtures";
import type { PassengerDetails } from "@/lib/types";

const PASSENGERS: PassengerDetails[] = [
  {
    title: "Mr",
    fullName: "MD RAHMAN AHMED",
    dob: "1990-04-12",
    nationality: "Bangladeshi",
    passportNumber: "A01234567",
    passportExpiry: "2030-08-20",
  },
];

describe("renderTicketPdf", () => {
  it("renders a non-empty PDF buffer for a one-way offer", async () => {
    const buf = await renderTicketPdf(makeOffer(), PASSENGERS, "ABC234");
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("renders a round-trip offer with a return leg", async () => {
    const offer = makeOffer({
      returnSegments: [
        makeSegment({
          carrier: BG,
          flightNumber: "BG 348",
          origin: DXB,
          destination: DAC,
          departureLocal: "2026-06-10T03:00:00",
          arrivalLocal: "2026-06-10T08:30:00",
        }),
      ],
    });
    const buf = await renderTicketPdf(offer, PASSENGERS, "XYZ789");
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renders multiple passengers", async () => {
    const buf = await renderTicketPdf(
      makeOffer(),
      [
        PASSENGERS[0],
        { ...PASSENGERS[0], fullName: "MRS FATIMA RAHMAN", title: "Mrs" },
      ],
      "MUL742"
    );
    expect(buf.length).toBeGreaterThan(1000);
  });
});
