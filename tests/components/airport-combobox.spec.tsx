import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AirportCombobox } from "@/components/airport-combobox";
import { DXB } from "../fixtures";

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    json: async () => ({ airports: [DXB] }),
  }) as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AirportCombobox", () => {
  it("shows the selected airport on the trigger", () => {
    render(<AirportCombobox value={DXB} onChange={() => {}} />);
    expect(screen.getByText("DXB")).toBeInTheDocument();
    expect(screen.getByText("· Dubai")).toBeInTheDocument();
  });

  it("debounces a query to the airports API and renders results", async () => {
    const user = userEvent.setup();
    render(<AirportCombobox onChange={() => {}} placeholder="Origin" />);

    await user.click(screen.getByRole("combobox"));
    await user.type(
      screen.getByPlaceholderText("City or airport code…"),
      "dub"
    );

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/airports?q=dub")
      )
    );
    expect(
      await screen.findByRole("option", { name: /Dubai/ })
    ).toBeInTheDocument();
  });

  it("calls onChange when a result is picked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AirportCombobox onChange={onChange} placeholder="Origin" />);

    await user.click(screen.getByRole("combobox"));
    await user.type(
      screen.getByPlaceholderText("City or airport code…"),
      "dub"
    );

    const option = await screen.findByRole("option", { name: /Dubai/ });
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith(DXB);
  });
});
