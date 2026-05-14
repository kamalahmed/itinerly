import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

/**
 * Rate-limits the public, unauthenticated search APIs to curb bot abuse.
 * No-ops when Upstash is not configured (see lib/ratelimit.ts).
 */
export const config = {
  matcher: ["/api/flights/search", "/api/airports"],
};

export async function middleware(req: NextRequest) {
  const ip = getClientIp(req);
  const result = await checkRateLimit(`${ip}:${req.nextUrl.pathname}`);

  if (!result.success) {
    const retryAfter = Math.max(
      1,
      Math.ceil((result.reset - Date.now()) / 1000)
    );
    return NextResponse.json(
      { error: "Too many requests — please slow down." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
        },
      }
    );
  }

  return NextResponse.next();
}
