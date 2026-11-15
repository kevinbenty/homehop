import { NextRequest, NextResponse } from "next/server";
import { runSearch } from "@/lib/engine";
import { sharedProvider } from "@/lib/flights";
import { allow } from "@/lib/rate-limit";
import { estimateCalls, MAX_CALLS, SearchInputSchema } from "@/lib/search-input";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const parsed = SearchInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search", issues: parsed.error.issues }, { status: 400 });
  }
  const calls = estimateCalls(parsed.data);
  if (calls > MAX_CALLS) {
    return NextResponse.json({ error: `This search needs ${calls} flight lookups; the limit is ${MAX_CALLS}. Pick fewer airports or fewer flexible days.` }, { status: 400 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const max = Number(process.env.SEARCHES_PER_HOUR ?? 20);
  if (!allow(`search:${ip}`, max, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many searches from your network this hour. Try again later." }, { status: 429 });
  }
  try {
    const result = await runSearch(parsed.data, sharedProvider());
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}
