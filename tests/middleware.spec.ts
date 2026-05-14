import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "203.0.113.5"),
}));

import { middleware } from "@/middleware";
import { checkRateLimit } from "@/lib/ratelimit";

const SEARCH = "http://localhost/api/flights/search?origin=DAC";

beforeEach(() => {
  vi.mocked(checkRateLimit).mockReset();
});

describe("rate-limit middleware", () => {
  it("allows a request that is under the limit", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      reset: Date.now() + 10_000,
    });

    const res = await middleware(new NextRequest(SEARCH));
    expect(res.status).not.toBe(429);
    // NextResponse.next() carries this internal header.
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("blocks a request over the limit with 429 and Retry-After", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      reset: Date.now() + 8_000,
    });

    const res = await middleware(new NextRequest(SEARCH));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("30");
    const body = await res.json();
    expect(body.error).toMatch(/too many requests/i);
  });

  it("keys the limit by IP and path", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      reset: Date.now() + 10_000,
    });

    await middleware(new NextRequest(SEARCH));
    expect(checkRateLimit).toHaveBeenCalledWith(
      "203.0.113.5:/api/flights/search"
    );
  });
});
