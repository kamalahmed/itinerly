import { describe, it, expect, vi, afterEach } from "vitest";
import { getClientIp, isRateLimitEnabled, checkRateLimit } from "@/lib/ratelimit";

function reqWith(headers: Record<string, string>, ip?: string) {
  return { headers: new Headers(headers), ip };
}

describe("getClientIp", () => {
  it("uses the first entry of x-forwarded-for", () => {
    expect(
      getClientIp(reqWith({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))
    ).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip", () => {
    expect(getClientIp(reqWith({ "x-real-ip": "198.51.100.7" }))).toBe(
      "198.51.100.7"
    );
  });

  it("falls back to req.ip", () => {
    expect(getClientIp(reqWith({}, "192.0.2.3"))).toBe("192.0.2.3");
  });

  it("defaults to localhost when nothing is available", () => {
    expect(getClientIp(reqWith({}))).toBe("127.0.0.1");
  });
});

describe("rate limiting when Upstash is not configured", () => {
  it("reports rate limiting as disabled", () => {
    expect(isRateLimitEnabled()).toBe(false);
  });

  it("allows every request", async () => {
    const r = await checkRateLimit("203.0.113.5");
    expect(r.success).toBe(true);
  });
});

describe("rate limiting when Upstash is configured", () => {
  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.resetModules();
    vi.doUnmock("@upstash/ratelimit");
    vi.doUnmock("@upstash/redis");
  });

  it("delegates to the Upstash limiter and maps the result", async () => {
    const limit = vi.fn().mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      reset: 1_700_000_000,
    });
    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class {
        static slidingWindow() {
          return {};
        }
        limit = limit;
      },
    }));
    vi.doMock("@upstash/redis", () => ({ Redis: class {} }));
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    vi.resetModules();

    const mod = await import("@/lib/ratelimit");
    expect(mod.isRateLimitEnabled()).toBe(true);

    const r = await mod.checkRateLimit("203.0.113.5");
    expect(limit).toHaveBeenCalledWith("203.0.113.5");
    expect(r.success).toBe(false);
    expect(r.limit).toBe(30);
    expect(r.reset).toBe(1_700_000_000);
  });
});
