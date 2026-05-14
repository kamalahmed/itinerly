import { describe, it, expect } from "vitest";
import {
  USD_TO_BDT,
  usdToBdt,
  formatUSD,
  formatBDT,
  formatDual,
} from "@/lib/currency";

describe("currency", () => {
  it("uses the hard-coded 119 BDT rate", () => {
    expect(USD_TO_BDT).toBe(119);
  });

  it("converts USD to BDT and rounds", () => {
    expect(usdToBdt(320)).toBe(38080);
    expect(usdToBdt(99.5)).toBe(Math.round(99.5 * 119));
  });

  it("formats USD with no fraction digits", () => {
    expect(formatUSD(320)).toBe("$320");
    expect(formatUSD(1080.4)).toBe("$1,080");
  });

  it("formats BDT with the currency code", () => {
    const out = formatBDT(38080);
    expect(out).toMatch(/38,080/);
    expect(out).toMatch(/BDT|৳/);
  });

  it("formatDual shows USD then BDT", () => {
    const out = formatDual(320);
    expect(out.startsWith("$320")).toBe(true);
    expect(out).toContain("·");
    expect(out).toMatch(/38,080/);
  });
});
