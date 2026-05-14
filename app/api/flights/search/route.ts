import { NextRequest, NextResponse } from "next/server";
import { SearchSchema } from "@/lib/search-schema";
import { searchWithChain } from "@/lib/providers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = SearchSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid search parameters", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const { offers, source } = await searchWithChain(parsed.data);
    return NextResponse.json({ offers, source, count: offers.length });
  } catch (err) {
    console.error("[/api/flights/search] failed:", err);
    return NextResponse.json(
      { error: "Search failed", offers: [] },
      { status: 500 }
    );
  }
}
