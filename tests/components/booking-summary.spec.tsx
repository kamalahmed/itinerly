import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookingSummary } from "@/components/booking-summary";
import { makeOffer, makeSegment, DAC, DXB, BG } from "../fixtures";

describe("BookingSummary", () => {
  it("renders the outbound leg and fare breakdown", () => {
    render(<BookingSummary offer={makeOffer()} />);
    expect(screen.getByText("Itinerary")).toBeInTheDocument();
    expect(screen.getByText("Outbound")).toBeInTheDocument();
    expect(screen.getByText("Base fare")).toBeInTheDocument();
    expect(screen.getByText("$256")).toBeInTheDocument(); // base
    expect(screen.getByText("$320")).toBeInTheDocument(); // total
    expect(screen.getByText(/38,080/)).toBeInTheDocument(); // BDT
  });

  it("renders a return leg for a round-trip offer", () => {
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
    render(<BookingSummary offer={offer} />);
    expect(screen.getByText("Return")).toBeInTheDocument();
  });
});
