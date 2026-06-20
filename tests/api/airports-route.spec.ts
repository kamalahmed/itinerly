import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/airports/route";

const BASE = "http://localhost/api/airports";

describe("GET /api/airports", () => {
  it("returns matching airports for a query", async () => {
    const res = await GET(new NextRequest(`${BASE}?q=dxb`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.airports[0].iata).toBe("DXB");
  });

  it("matches by city name", async () => {
    const res = await GET(new NextRequest(`${BASE}?q=dhaka`));
    const body = await res.json();
    expect(body.airports.some((a: { iata: string }) => a.iata === "DAC")).toBe(
      true
    );
  });

  it("caps results at the limit", async () => {
    const res = await GET(new NextRequest(`${BASE}?q=a`));
    const body = await res.json();
    expect(body.airports.length).toBeLessThanOrEqual(10);
  });

  it("returns geo-default origins for nearby=1 with no query", async () => {
    const res = await GET(
      new NextRequest(`${BASE}?nearby=1`, {
        headers: { "x-vercel-ip-country": "BD" },
      })
    );
    const body = await res.json();
    expect(body.airports.length).toBeGreaterThan(0);
    expect(body.airports.every((a: { countryCode: string }) => a.countryCode === "BD")).toBe(true);
  });

  it("returns an empty list for a missing query", async () => {
    const res = await GET(new NextRequest(BASE));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.airports).toEqual([]);
  });
});
