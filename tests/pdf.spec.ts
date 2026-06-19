import { describe, it, expect } from "vitest";
import {
  renderTicketPdf,
  buildItineraryModel,
  DOC_TITLE,
  FOOTER_NOTE,
} from "@/lib/pdf";
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

describe("itinerary wording (professional, honest — not loud disclaimers)", () => {
  const LOUD = /dummy|fake|visa|fraud|sample|no seat has been|not a confirmed airline/i;

  it("uses a clean professional document title with no 'visa' wording", () => {
    expect(DOC_TITLE).toMatch(/itinerary/i);
    expect(DOC_TITLE).not.toMatch(LOUD);
  });

  it("has a single understated footer note, not a loud disclaimer block", () => {
    expect(FOOTER_NOTE).not.toMatch(LOUD);
    expect(FOOTER_NOTE).not.toContain("\n"); // single line, not a paragraph block
    expect(FOOTER_NOTE.length).toBeLessThan(170);
    // Still honest: it's an itinerary/reservation, not a paid ticket.
    expect(FOOTER_NOTE).toMatch(/itinerary|reservation/i);
    expect(FOOTER_NOTE).toMatch(/payment|receipt/i);
  });
});

describe("buildItineraryModel", () => {
  it("maps passengers, segments and fare into a renderable model", () => {
    const m = buildItineraryModel(makeOffer(), PASSENGERS, "ABC234", "19 Jun 2026");
    expect(m.pnr).toBe("ABC234");
    expect(m.docTitle).toBe(DOC_TITLE);
    expect(m.footerNote).toBe(FOOTER_NOTE);
    expect(m.status).toBeTruthy();

    expect(m.passengers[0].name).toContain("MD RAHMAN AHMED");
    expect(m.passengers[0].passport).toContain("A01234567");

    expect(m.legs).toHaveLength(1);
    expect(m.legs[0].label).toMatch(/outbound/i);
    const seg = m.legs[0].segments[0];
    expect(seg.origin.code).toBe("DAC");
    expect(seg.destination.code).toBe("DXB");
    expect(seg.departTime).toBe("09:55");
    expect(seg.flightNumber).toBe("EK 583");
    expect(seg.airlineName).toBe("Emirates");

    expect(m.fare.total).toContain("$320");
  });

  it("includes a return leg for round-trip offers", () => {
    const offer = makeOffer({
      returnSegments: [
        makeSegment({ carrier: BG, flightNumber: "BG 348", origin: DXB, destination: DAC }),
      ],
    });
    const m = buildItineraryModel(offer, PASSENGERS, "XYZ789", "19 Jun 2026");
    expect(m.legs).toHaveLength(2);
    expect(m.legs[1].label).toMatch(/return/i);
  });

  it("renders route codes without relying on a glyph the PDF font lacks", () => {
    const m = buildItineraryModel(makeOffer(), PASSENGERS, "ABC234", "19 Jun 2026");
    const seg = m.legs[0].segments[0];
    // We keep origin/destination as discrete fields so the layout draws the
    // connector instead of embedding a → that Helvetica can't render.
    expect(seg.origin.code).toBe("DAC");
    expect(seg.destination.code).toBe("DXB");
  });
});
