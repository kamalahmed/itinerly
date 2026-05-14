import { describe, it, expect } from "vitest";
import { bnCity } from "@/lib/i18n";

describe("bnCity", () => {
  it("returns the Bengali name for a known city", () => {
    expect(bnCity("Dhaka")).toBe("ঢাকা");
    expect(bnCity("Dubai")).toBe("দুবাই");
    expect(bnCity("London")).toBe("লন্ডন");
  });

  it("returns undefined for an unknown city", () => {
    expect(bnCity("Atlantis")).toBeUndefined();
  });

  it("is case-sensitive (keys are canonical English names)", () => {
    expect(bnCity("dhaka")).toBeUndefined();
  });
});
