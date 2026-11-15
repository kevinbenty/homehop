import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { safeAuth } from "@/auth";
import { alerts as alertsTable } from "@/db/schema";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { encodeQuery, SearchInputSchema } from "@/lib/search-input";

async function requireUser() {
  const session = await safeAuth();
  if (!session?.user?.id) redirect("/signin?callbackUrl=/alerts");
  return session.user.id;
}

async function setActive(formData: FormData) {
  "use server";
  const userId = await requireUser();
  await db
    .update(alertsTable)
    .set({ active: formData.get("active") === "true" })
    .where(and(eq(alertsTable.id, String(formData.get("id"))), eq(alertsTable.userId, userId)));
  revalidatePath("/alerts");
}

async function remove(formData: FormData) {
  "use server";
  const userId = await requireUser();
  await db.delete(alertsTable).where(and(eq(alertsTable.id, String(formData.get("id"))), eq(alertsTable.userId, userId)));
  revalidatePath("/alerts");
}

export default async function AlertsPage() {
  const userId = await requireUser();
  const alerts = await db.select().from(alertsTable).where(eq(alertsTable.userId, userId)).orderBy(desc(alertsTable.createdAt));

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-3xl font-bold">My price alerts</h1>
      <p className="text-muted">We re-run each search once a day across all its airports and email you when the door-to-door total hits your target.</p>
      {alerts.length === 0 && (
        <p className="rounded-2xl border border-line bg-white p-6">No alerts yet. <Link href="/" className="font-semibold text-accent">Search for a trip</Link> and set one from any result.</p>
      )}
      {alerts.map((a) => {
        const parsed = SearchInputSchema.safeParse(a.query);
        return (
          <article key={a.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="font-bold">{a.label}</h2>
              <p className="text-sm text-muted">
                Target {a.targetPrice != null ? money(a.targetPrice, a.currency) : "any 3% drop"} · started at {money(a.startPrice, a.currency)} ·
                latest {a.lastBestTotal != null ? money(a.lastBestTotal, a.currency) : "–"}
                {a.lastCheckedAt ? ` (checked ${a.lastCheckedAt.toISOString().slice(0, 10)})` : ""}
              </p>
              <p className="text-sm font-semibold">{a.active ? "Active" : "Paused"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {parsed.success && <Link href={`/results?q=${encodeQuery(parsed.data)}`} className="rounded-lg border-2 border-ink px-3 py-2 font-semibold">See results</Link>}
              <form action={setActive}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="active" value={String(!a.active)} />
                <button className="rounded-lg border-2 border-line px-3 py-2 font-semibold">{a.active ? "Pause" : "Resume"}</button>
              </form>
              <form action={remove}>
                <input type="hidden" name="id" value={a.id} />
                <button className="rounded-lg px-3 py-2 font-semibold text-[#8a2b00] hover:bg-[#fff4e6]">Delete</button>
              </form>
            </div>
          </article>
        );
      })}
    </div>
  );
}
