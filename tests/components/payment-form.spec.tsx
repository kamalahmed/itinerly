import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentForm } from "@/components/payment-form";
import { confirmBooking } from "@/app/booking/actions";

vi.mock("@/app/booking/actions", () => ({
  confirmBooking: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(confirmBooking).mockReset();
});

describe("PaymentForm", () => {
  it("renders the mock payment form", () => {
    render(<PaymentForm bookingId="b1" />);
    expect(screen.getByText("Payment")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Pay & generate itinerary/ })
    ).toBeInTheDocument();
    expect(screen.getByText(/mock payment screen/i)).toBeInTheDocument();
  });

  it("shows a processing state and confirms the booking after the delay", async () => {
    const user = userEvent.setup();
    render(<PaymentForm bookingId="b1" />);

    await user.click(
      screen.getByRole("button", { name: /Pay & generate itinerary/ })
    );

    // The button immediately switches to the processing state.
    expect(
      screen.getByRole("button", { name: /Processing/ })
    ).toBeInTheDocument();

    // After the simulated 1.5s delay the booking is confirmed.
    await waitFor(
      () => expect(confirmBooking).toHaveBeenCalledWith("b1"),
      { timeout: 3000 }
    );
  });
});
