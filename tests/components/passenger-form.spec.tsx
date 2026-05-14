import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PassengerForm } from "@/components/passenger-form";
import { savePassengers } from "@/app/booking/actions";

vi.mock("@/app/booking/actions", () => ({
  savePassengers: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(savePassengers).mockReset();
});

describe("PassengerForm", () => {
  it("renders a single passenger by default", () => {
    render(<PassengerForm bookingId="b1" />);
    expect(screen.getByText("Passenger 1")).toBeInTheDocument();
    expect(screen.queryByText("Passenger 2")).not.toBeInTheDocument();
  });

  it("adds and removes passengers", async () => {
    const user = userEvent.setup();
    render(<PassengerForm bookingId="b1" />);

    await user.click(screen.getByRole("button", { name: /Add passenger/ }));
    expect(screen.getByText("Passenger 2")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Remove/ })[0]);
    expect(screen.queryByText("Passenger 2")).not.toBeInTheDocument();
  });

  it("shows validation errors on an empty submit", async () => {
    const user = userEvent.setup();
    render(<PassengerForm bookingId="b1" />);

    await user.click(
      screen.getByRole("button", { name: /Continue to payment/ })
    );

    expect(
      await screen.findByText(/Enter the full name as in the passport/)
    ).toBeInTheDocument();
    expect(savePassengers).not.toHaveBeenCalled();
  });

  it("submits valid passenger details to the savePassengers action", async () => {
    const user = userEvent.setup();
    render(<PassengerForm bookingId="b1" />);

    await user.type(
      screen.getByPlaceholderText("MD RAHMAN AHMED"),
      "MD RAHMAN AHMED"
    );
    await user.type(screen.getByPlaceholderText("A01234567"), "A01234567");

    const [dob, expiry] = screen.getAllByDisplayValue("");
    fireEvent.change(dob, { target: { value: "1990-04-12" } });
    fireEvent.change(expiry, { target: { value: "2030-08-20" } });

    await user.click(
      screen.getByRole("button", { name: /Continue to payment/ })
    );

    await waitFor(() => expect(savePassengers).toHaveBeenCalledTimes(1));
    const [bookingId, passengers] = vi.mocked(savePassengers).mock.calls[0];
    expect(bookingId).toBe("b1");
    expect(passengers).toHaveLength(1);
    expect(passengers[0]).toMatchObject({
      title: "Mr",
      fullName: "MD RAHMAN AHMED",
      nationality: "Bangladeshi",
      passportNumber: "A01234567",
      dob: "1990-04-12",
      passportExpiry: "2030-08-20",
    });
  });
});
