import { describe, it, expect } from "vitest";
import {
  SearchSchema,
  parseSearchParams,
  toSearchParams,
} from "@/lib/search-schema";

describe("SearchSchema", () => {
  it("parses a minimal valid query and applies defaults", () => {
    const r = SearchSchema.safeParse({
      origin: "dac",
      destination: "dxb",
      departDate: "2026-06-01",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.origin).toBe("DAC"); // upper-cased
      expect(r.data.destination).toBe("DXB");
      expect(r.data.cabin).toBe("economy");
      expect(r.data.adults).toBe(1);
      expect(r.data.tripType).toBe("one_way");
      expect(r.data.nonStopOnly).toBe(false);
    }
  });

  it("coerces numeric pax strings", () => {
    const r = SearchSchema.safeParse({
      origin: "DAC",
      destination: "DXB",
      departDate: "2026-06-01",
      adults: "2",
      children: "1",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.adults).toBe(2);
      expect(r.data.children).toBe(1);
    }
  });

  it("rejects a malformed date", () => {
    const r = SearchSchema.safeParse({
      origin: "DAC",
      destination: "DXB",
      departDate: "01/06/2026",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a non-3-letter IATA code", () => {
    const r = SearchSchema.safeParse({
      origin: "DA",
      destination: "DXB",
      departDate: "2026-06-01",
    });
    expect(r.success).toBe(false);
  });

  it("interprets nonStopOnly string flags", () => {
    const r = SearchSchema.safeParse({
      origin: "DAC",
      destination: "DXB",
      departDate: "2026-06-01",
      nonStopOnly: "true",
    });
    expect(r.success && r.data.nonStopOnly).toBe(true);
  });
});

describe("parseSearchParams", () => {
  it("returns a SearchQuery for valid params", () => {
    const q = parseSearchParams({
      origin: "DAC",
      destination: "DXB",
      departDate: "2026-06-01",
      tripType: "round_trip",
      returnDate: "2026-06-10",
    });
    expect(q).not.toBeNull();
    expect(q?.tripType).toBe("round_trip");
    expect(q?.returnDate).toBe("2026-06-10");
  });

  it("returns null for invalid params", () => {
    expect(parseSearchParams({ origin: "DAC" })).toBeNull();
  });

  it("flattens array-valued params", () => {
    const q = parseSearchParams({
      origin: ["DAC"],
      destination: ["DXB"],
      departDate: ["2026-06-01"],
    });
    expect(q?.origin).toBe("DAC");
  });
});

describe("toSearchParams", () => {
  it("builds a querystring and round-trips through parseSearchParams", () => {
    const qs = toSearchParams({
      origin: "DAC",
      destination: "DXB",
      departDate: "2026-06-01",
      cabin: "business",
      adults: 2,
      children: 0,
      infants: 0,
      tripType: "one_way",
    });
    const params = Object.fromEntries(new URLSearchParams(qs));
    const parsed = parseSearchParams(params);
    expect(parsed?.origin).toBe("DAC");
    expect(parsed?.cabin).toBe("business");
    expect(parsed?.adults).toBe(2);
  });

  it("omits a return date when not provided", () => {
    const qs = toSearchParams({ origin: "DAC", destination: "DXB" });
    expect(qs).not.toContain("returnDate");
  });
});
