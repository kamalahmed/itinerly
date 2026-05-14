import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlightList } from "@/components/flight-list";
import { makeOffer, makeSegment, DAC, DXB, BG, EK } from "../fixtures";

vi.mock("@/app/booking/actions", () => ({
  createBookingDraft: vi.fn(),
}));

const OFFERS = [
  makeOffer({ id: "a", totalPriceUSD: 320, outboundSegments: [makeSegment({ carrier: EK })] }),
  makeOffer({ id: "b", totalPriceUSD: 410, outboundSegments: [makeSegment({ carrier: BG, flightNumber: "BG 301" })] }),
  makeOffer({
    id: "c",
    totalPriceUSD: 250,
    stops: 1,
    outboundSegments: [
      makeSegment({ carrier: EK }),
      makeSegment({ carrier: EK, origin: DXB, destination: DAC }),
    ],
  }),
];

describe("FlightList", () => {
  it("renders every offer by default", () => {
    render(<FlightList offers={OFFERS} />);
    expect(screen.getByText("3 of 3 flights")).toBeInTheDocument();
  });

  it("filters to non-stop flights only", async () => {
    const user = userEvent.setup();
    render(<FlightList offers={OFFERS} />);
    await user.click(
      screen.getByRole("checkbox", { name: /Non-stop only/ })
    );
    expect(screen.getByText("2 of 3 flights")).toBeInTheDocument();
  });

  it("filters by airline", async () => {
    const user = userEvent.setup();
    render(<FlightList offers={OFFERS} />);
    await user.click(
      screen.getByRole("checkbox", {
        name: /Biman Bangladesh Airlines/,
      })
    );
    expect(screen.getByText("1 of 3 flights")).toBeInTheDocument();
  });

  it("filters by max price via the slider", () => {
    render(<FlightList offers={OFFERS} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "300" } });
    // Only the $250 offer is <= 300.
    expect(screen.getByText("1 of 3 flights")).toBeInTheDocument();
  });

  it("shows an empty state when filters exclude everything", async () => {
    const user = userEvent.setup();
    render(<FlightList offers={OFFERS} />);
    // Every fixture offer departs at 09:55 — the "Before 06:00" bucket matches none.
    await user.click(
      screen.getByRole("checkbox", { name: /Before 06:00/ })
    );
    expect(
      screen.getByText("No flights match your filters.")
    ).toBeInTheDocument();
  });
});
