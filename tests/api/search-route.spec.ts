import { describe, it, expect, afterEach } from "vitest";
import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { GET } from "@/app/api/flights/search/route";

const BASE = "http://localhost/api/flights/search";

function req(query: string): NextRequest {
  return new NextRequest(`${BASE}?${query}`);
}

afterEach(async () => {
  await prisma.searchCache.deleteMany();
});

describe("GET /api/flights/search", () => {
  it("returns offers for a valid DAC→DXB query", async () => {
    const res = await GET(
      req("origin=DAC&destination=DXB&departDate=2026-06-01&adults=1")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.offers)).toBe(true);
    expect(body.offers.length).toBeGreaterThanOrEqual(1);
    expect(body.count).toBe(body.offers.length);
    expect(body.source).toBe("mock");
    expect(body.offers[0].outboundSegments[0].origin.iata).toBe("DAC");
  });

  it("rejects an invalid query with 400", async () => {
    const res = await GET(req("origin=DAC&destination=DXB")); // no departDate
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("rejects a malformed IATA code with 400", async () => {
    const res = await GET(
      req("origin=DACK&destination=DXB&departDate=2026-06-01")
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 with an empty list for an unseeded route", async () => {
    const res = await GET(
      req("origin=DAC&destination=ZZZ&departDate=2026-06-01")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.offers).toEqual([]);
    expect(body.count).toBe(0);
  });
});
