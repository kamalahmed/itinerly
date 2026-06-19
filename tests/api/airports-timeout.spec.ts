import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Simulate the DB call timing out / failing fast.
vi.mock("@/lib/airports", () => ({
  searchAirports: vi.fn().mockRejectedValue(new Error("load airports timed out")),
}));

import { GET } from "@/app/api/airports/route";

describe("GET /api/airports — DB outage", () => {
  it("fails fast with an empty list instead of hanging", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/airports?q=dac")
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.airports).toEqual([]);
    expect(body.error).toMatch(/unavailable/i);
  });
});
