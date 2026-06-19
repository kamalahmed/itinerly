import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { withTimeout } from "@/lib/with-timeout";

/**
 * Per-IP rate limiting for the public search APIs, backed by Upstash Redis so
 * it works correctly across Vercel's serverless instances.
 *
 * When UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set (local
 * dev, CI), rate limiting is disabled and every request is allowed — the app
 * stays fully functional without the external service.
 */

// 30 requests per 10 seconds per IP — generous for real users, throttles bots.
const WINDOW_LIMIT = 30;
const WINDOW = "10 s" as const;

let limiter: Ratelimit | null | undefined;

function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) return limiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    limiter = null;
    return null;
  }
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(WINDOW_LIMIT, WINDOW),
    prefix: "itinerly:ratelimit",
    analytics: false,
  });
  return limiter;
}

export function isRateLimitEnabled(): boolean {
  return getLimiter() !== null;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // epoch ms when the window resets
}

/** Check (and consume) a request slot for the given identifier (usually an IP). */
export async function checkRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  try {
    const l = getLimiter();
    if (!l) {
      // Rate limiting disabled — allow everything.
      return { success: true, limit: 0, remaining: 0, reset: 0 };
    }
    // Bound the Upstash round-trip so a slow/unreachable limiter can't stall
    // (or crash) the middleware that runs on every matched request.
    const r = await withTimeout(l.limit(identifier), 2000, "ratelimit");
    return {
      success: r.success,
      limit: r.limit,
      remaining: r.remaining,
      reset: r.reset,
    };
  } catch (err) {
    // Fail OPEN: a rate-limiter outage (Upstash down, bad config, slow network)
    // must never take down the site. Allow the request rather than letting the
    // error bubble out of the middleware (which 500s as MIDDLEWARE_INVOCATION_FAILED).
    console.error("[ratelimit] limiter unavailable, allowing request:", err);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}

/** Best-effort client IP from proxy headers, with a localhost fallback. */
export function getClientIp(req: {
  headers: Headers;
  ip?: string;
}): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return req.ip ?? "127.0.0.1";
}
