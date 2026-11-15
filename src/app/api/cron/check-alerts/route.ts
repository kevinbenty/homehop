import { NextRequest, NextResponse } from "next/server";
import { checkAlerts } from "@/lib/alerts";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Vercel Cron calls this daily with `Authorization: Bearer $CRON_SECRET`.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const appUrl = process.env.APP_URL ?? req.nextUrl.origin;
  const report = await checkAlerts({ batch: Number(process.env.ALERT_BATCH ?? 10), appUrl });
  return NextResponse.json(report);
}
