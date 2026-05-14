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

  it("caps results at 8", async () => {
    const res = await GET(new NextRequest(`${BASE}?q=a`));
    const body = await res.json();
    expect(body.airports.length).toBeLessThanOrEqual(8);
  });

  it("returns an empty list for a missing query", async () => {
    const res = await GET(new NextRequest(BASE));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.airports).toEqual([]);
  });
});
