import { NextRequest, NextResponse } from "next/server";
import { searchAirports } from "@/lib/airports";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 1) {
    return NextResponse.json({ airports: [] });
  }
  const airports = await searchAirports(q, 8);
  return NextResponse.json({ airports });
}
