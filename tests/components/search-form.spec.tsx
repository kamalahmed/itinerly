import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchForm } from "@/components/search-form";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => push.mockReset());

describe("SearchForm", () => {
  it("renders trip-type tabs and the search button", () => {
    render(<SearchForm />);
    expect(screen.getByRole("tab", { name: "One-way" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Round-trip" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Search flights/ })
    ).toBeInTheDocument();
  });

  it("blocks submit and shows an error when no airports are chosen", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);
    await user.click(screen.getByRole("button", { name: /Search flights/ }));
    expect(
      screen.getByText("Select both an origin and a destination.")
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("increments the passenger count from the popover", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);

    await user.click(screen.getByRole("button", { name: /1 passenger/ }));
    await user.click(
      screen.getByRole("button", { name: "Increase Adults" })
    );

    expect(
      screen.getByRole("button", { name: /2 passengers/ })
    ).toBeInTheDocument();
  });

  it("switches to the round-trip tab", async () => {
    const user = userEvent.setup();
    render(<SearchForm />);
    const roundTrip = screen.getByRole("tab", { name: "Round-trip" });
    await user.click(roundTrip);
    expect(roundTrip).toHaveAttribute("data-state", "active");
  });

  it("prefills from initial values", () => {
    render(
      <SearchForm
        initial={{
          origin: {
            iata: "DAC",
            name: "Hazrat Shahjalal International Airport",
            city: "Dhaka",
            country: "Bangladesh",
            countryCode: "BD",
            timeZone: "Asia/Dhaka",
          },
          adults: 3,
        }}
      />
    );
    expect(screen.getByText("DAC")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /3 passengers/ })
    ).toBeInTheDocument();
  });
});
