import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
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

  it("server-renders a timezone-independent departure field (no hydration mismatch)", () => {
    // Regression guard for the SSR/CSR hydration mismatch: the default
    // departure date must NOT be computed from the clock during render, or
    // the UTC server and a non-UTC client produce different date text and
    // React tears down the whole tree (React errors #418/#423/#425).
    const html = renderToStaticMarkup(<SearchForm />);
    expect(html).not.toMatch(/\d{1,2} \w{3} 20\d\d/); // e.g. "3 Jul 2026"
    expect(html).toContain("Pick a date");
  });

  it("fills in a default departure date on the client after mount", async () => {
    render(<SearchForm />);
    // After effects run, the departure field shows a concrete date.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /\d{1,2} \w{3} 20\d\d/ })
      ).toBeInTheDocument()
    );
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
