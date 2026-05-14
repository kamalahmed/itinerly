import { describe, it, expect } from "vitest";
import { generatePnr } from "@/lib/pnr";

describe("generatePnr", () => {
  it("returns a 6-character record locator", () => {
    expect(generatePnr()).toHaveLength(6);
  });

  it("only uses unambiguous uppercase alphanumerics (no I/O/0/1)", () => {
    for (let i = 0; i < 200; i++) {
      expect(generatePnr()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });

  it("is effectively unique across many calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(generatePnr());
    // 500 draws from 31^6 — collisions are vanishingly unlikely.
    expect(seen.size).toBeGreaterThan(495);
  });
});
