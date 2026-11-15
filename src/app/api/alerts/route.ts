import { and, count, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { safeAuth } from "@/auth";
import { alerts } from "@/db/schema";
import { db } from "@/lib/db";
import { findCity } from "@/lib/places";
import { SearchInputSchema } from "@/lib/search-input";

const Body = z.object({
  query: SearchInputSchema,
  startPrice: z.number().positive(),
  targetPrice: z.number().positive().nullable(),
});

const MAX_ALERTS_PER_USER = 5;

export async function POST(req: NextRequest) {
  const session = await safeAuth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in to set price alerts." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid alert" }, { status: 400 });

  const [{ n }] = await db.select({ n: count() }).from(alerts).where(and(eq(alerts.userId, userId), eq(alerts.active, true)));
  if (n >= MAX_ALERTS_PER_USER) {
    return NextResponse.json({ error: `You can have ${MAX_ALERTS_PER_USER} active alerts. Pause one first.` }, { status: 400 });
  }
  const q = parsed.data.query;
  const label = `${findCity(q.studyCity)?.name} ⇄ ${findCity(q.homeCity)?.name}, ${q.outDate} to ${q.retDate}`;
  const [row] = await db
    .insert(alerts)
    .values({
      userId,
      label,
      query: q,
      currency: q.currency,
      startPrice: parsed.data.startPrice,
      lastBestTotal: parsed.data.startPrice,
      lastCheckedAt: new Date(),
      targetPrice: parsed.data.targetPrice,
    })
    .returning({ id: alerts.id });
  return NextResponse.json({ id: row.id });
}
