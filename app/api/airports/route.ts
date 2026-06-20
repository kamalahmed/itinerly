import { NextRequest, NextResponse } from "next/server";
import { searchAirports, airportsByCountry } from "@/lib/airports";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams;
  const q = params.get("q") ?? "";

  // Empty query + nearby=1 → default origins from the visitor's country
  // (Vercel geo header), falling back to Bangladesh (the app's home market).
  if (q.trim().length < 1) {
    if (params.get("nearby")) {
      try {
        const country =
          req.headers.get("x-vercel-ip-country") ||
          process.env.DEFAULT_COUNTRY ||
          "BD";
        let airports = await airportsByCountry(country, 8);
        if (airports.length === 0) airports = await airportsByCountry("BD", 8);
        return NextResponse.json({ airports, country });
      } catch {
        return NextResponse.json({ airports: [] });
      }
    }
    return NextResponse.json({ airports: [] });
  }
  try {
    const airports = await searchAirports(q, 10);
    return NextResponse.json({ airports });
  } catch (err) {
    // Fail fast on a DB hang/outage instead of leaving the request pending.
    console.error("[/api/airports] lookup failed:", err);
    return NextResponse.json(
      { airports: [], error: "Airport lookup is temporarily unavailable." },
      { status: 503 }
    );
  }
}
