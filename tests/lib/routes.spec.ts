import { describe, it, expect } from "vitest";
import { SEO_ROUTES, getSeoRoute, routesByRegion } from "@/lib/routes";

describe("SEO_ROUTES", () => {
  it("defines at least 30 routes (spec requires >= 30)", () => {
    expect(SEO_ROUTES.length).toBeGreaterThanOrEqual(30);
  });

  it("has unique slugs", () => {
    const slugs = SEO_ROUTES.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses the echoflights slug convention (dhaka-to-...)", () => {
    for (const r of SEO_ROUTES) {
      expect(r.slug).toMatch(/^dhaka-to-[a-z0-9-]+$/);
    }
  });

  it("originates every route from DAC", () => {
    expect(SEO_ROUTES.every((r) => r.originIata === "DAC")).toBe(true);
  });
});

describe("getSeoRoute", () => {
  it("resolves a known slug", () => {
    const r = getSeoRoute("dhaka-to-dubai-uae");
    expect(r?.destinationIata).toBe("DXB");
    expect(r?.destinationCity).toBe("Dubai");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getSeoRoute("dhaka-to-narnia")).toBeUndefined();
  });
});

describe("routesByRegion", () => {
  it("groups every route under a region without dropping any", () => {
    const grouped = routesByRegion();
    const total = Object.values(grouped).reduce(
      (sum, list) => sum + list.length,
      0
    );
    expect(total).toBe(SEO_ROUTES.length);
  });

  it("includes the expected regions", () => {
    const grouped = routesByRegion();
    expect(Object.keys(grouped)).toEqual(
      expect.arrayContaining(["Middle East", "South Asia", "Europe"])
    );
  });
});
