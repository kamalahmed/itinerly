import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlightCard } from "@/components/flight-card";
import { makeOffer, makeSegment, DAC, DXB, BG } from "../fixtures";

// FlightCard's "Select" button posts to a server action — stub it.
vi.mock("@/app/booking/actions", () => ({
  createBookingDraft: vi.fn(),
}));

describe("FlightCard", () => {
  it("renders price in USD and BDT, carrier, route and times", () => {
    render(<FlightCard offer={makeOffer()} />);
    expect(screen.getByText("$320")).toBeInTheDocument();
    expect(screen.getByText(/38,080/)).toBeInTheDocument(); // 320 USD * 119
    expect(screen.getByText("09:55")).toBeInTheDocument();
    expect(screen.getByText("13:20")).toBeInTheDocument();
    expect(screen.getAllByText("DAC").length).toBeGreaterThan(0);
    expect(screen.getAllByText("DXB").length).toBeGreaterThan(0);
    expect(screen.getByText("Non-stop")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select" })
    ).toBeInTheDocument();
  });

  it("expands to show segment details on click", async () => {
    const user = userEvent.setup();
    render(<FlightCard offer={makeOffer()} />);

    // Segment detail (flight number / aircraft) is hidden until expanded.
    expect(screen.queryByText(/Boeing 777-300ER/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Flight details/ }));

    expect(screen.getByText(/EK 583/)).toBeInTheDocument();
    expect(screen.getByText(/Boeing 777-300ER/)).toBeInTheDocument();
    expect(screen.getByText(/Base fare/)).toBeInTheDocument();
  });

  it("shows a Return leg for a round-trip offer", () => {
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
    render(<FlightCard offer={offer} />);
    expect(screen.getByText("Outbound")).toBeInTheDocument();
    expect(screen.getByText("Return")).toBeInTheDocument();
  });

  it("labels stops for a connecting itinerary", () => {
    const offer = makeOffer({
      stops: 1,
      outboundSegments: [
        makeSegment(),
        makeSegment({
          flightNumber: "EK 600",
          origin: DXB,
          destination: DAC,
        }),
      ],
    });
    render(<FlightCard offer={offer} />);
    expect(screen.getByText("1 stop")).toBeInTheDocument();
  });
});
