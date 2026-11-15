import { and, asc, eq, isNull, lt, or } from "drizzle-orm";
import { Alert, alerts, users } from "@/db/schema";
import { db } from "./db";
import { escapeHtml, sendEmail } from "./email";
import { runSearch } from "./engine";
import { sharedProvider } from "./flights";
import { money } from "./format";
import { SearchInputSchema } from "./search-input";

const DAY_MS = 20 * 60 * 60 * 1000;

/** True when a new best price should trigger an email. */
export function shouldNotify(alert: Pick<Alert, "targetPrice" | "lastBestTotal" | "lastNotifiedAt">, best: number, now = new Date()): boolean {
  if (alert.lastNotifiedAt && now.getTime() - alert.lastNotifiedAt.getTime() < DAY_MS) return false;
  if (alert.targetPrice != null) return best <= alert.targetPrice;
  return alert.lastBestTotal != null && best <= alert.lastBestTotal * 0.97;
}

export async function checkAlerts(opts: { batch?: number; appUrl: string }) {
  const cutoff = new Date(Date.now() - DAY_MS);
  const due = await db
    .select({ alert: alerts, email: users.email })
    .from(alerts)
    .innerJoin(users, eq(users.id, alerts.userId))
    .where(and(eq(alerts.active, true), or(isNull(alerts.lastCheckedAt), lt(alerts.lastCheckedAt, cutoff))))
    .orderBy(asc(alerts.lastCheckedAt))
    .limit(opts.batch ?? 10);

  const today = new Date().toISOString().slice(0, 10);
  const report = { checked: 0, notified: 0, expired: 0, failed: 0 };

  for (const { alert: a, email } of due) {
    const parsed = SearchInputSchema.safeParse(a.query);
    if (!parsed.success || parsed.data.outDate <= today) {
      await db.update(alerts).set({ active: false }).where(eq(alerts.id, a.id));
      report.expired++;
      continue;
    }
    try {
      const result = await runSearch(parsed.data, sharedProvider());
      const best = result.trips[0];
      report.checked++;
      if (!best) {
        await db.update(alerts).set({ lastCheckedAt: new Date() }).where(eq(alerts.id, a.id));
        continue;
      }
      let notify = false;
      if (shouldNotify(a, best.total) && email) {
        const route = `${best.out.slice.origin} → ${best.out.slice.destination}, back ${best.back.slice.origin} → ${best.back.slice.destination}`;
        notify = await sendEmail(
          email,
          `HomeHop: ${money(best.total, a.currency)} door to door`,
          `<p>Your trip <strong>${escapeHtml(a.label)}</strong> is now <strong>${money(best.total, a.currency)}</strong> door to door (was ${money(a.lastBestTotal ?? a.startPrice, a.currency)}).</p>
           <p>${escapeHtml(route)}</p>
           <p><a href="${opts.appUrl}/alerts">See it on HomeHop</a>. Prices change fast, so check before you book.</p>`,
        );
        if (notify) report.notified++;
      }
      await db
        .update(alerts)
        .set({ lastBestTotal: best.total, lastCheckedAt: new Date(), ...(notify ? { lastNotifiedAt: new Date() } : {}) })
        .where(eq(alerts.id, a.id));
    } catch (e) {
      console.error("alert check failed", a.id, e);
      report.failed++;
    }
  }
  return report;
}
