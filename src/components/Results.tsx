"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { SearchResult, Trip, TripLeg } from "@/lib/engine";
import { clock, duration, money, shortDate } from "@/lib/format";
import { findCity } from "@/lib/places";
import type { SearchInput } from "@/lib/search-input";

type Sort = "cheap" | "balance" | "fast";
const TICKET: Record<Trip["kind"], string> = { return: "Return ticket", openjaw: "Open-jaw ticket", separate: "2 one-way tickets" };

export default function Results({ input, q, signedIn }: { input: SearchInput; q: string; signedIn: boolean }) {
  const [data, setData] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("cheap");
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(10);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "Search failed");
        if (alive) setData(body);
      })
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [input]);

  const study = findCity(input.studyCity)!;
  const home = findCity(input.homeCity)!;

  const sorted = useMemo(() => {
    if (!data) return [];
    const list = [...data.trips];
    const score = (t: Trip) => (sort === "cheap" ? t.total : sort === "fast" ? t.avgMin : t.total + (t.avgMin / 60) * data.hourValue);
    return list.sort((a, b) => score(a) - score(b));
  }, [data, sort]);

  const cheapestId = data?.trips.length ? [...data.trips].sort((a, b) => a.total - b.total)[0].id : null;
  const fastestId = data?.trips.length ? [...data.trips].sort((a, b) => a.avgMin - b.avgMin)[0].id : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Link href={`/?q=${q}`} className="self-start py-2 font-semibold text-accent">← Edit search</Link>
          <h1 className="font-display text-3xl font-bold">{study.name} ⇄ {home.name}</h1>
          <span className="text-[15px] text-muted">
            {shortDate(input.outDate)} – {shortDate(input.retDate)}{input.flexDays ? ` (±${input.flexDays} days)` : ""} · {input.origins.join(", ")} → {input.dests.join(", ")} · door to door, per person
          </span>
        </div>
        <div role="group" aria-label="Sort results" className="flex gap-1.5 rounded-xl border border-line bg-white p-1">
          {([["cheap", "Cheapest"], ["balance", "Best balance"], ["fast", "Fastest"]] as const).map(([k, l]) => (
            <button key={k} aria-pressed={sort === k} onClick={() => setSort(k)}
              className={`h-10 rounded-lg px-3.5 text-sm font-semibold ${sort === k ? "bg-ink text-white" : "text-[#3a4552] hover:bg-ground"}`}>{l}</button>
          ))}
        </div>
      </div>

      {!data && !error && (
        <div className="rounded-2xl border border-line bg-white p-8" role="status">
          <p className="font-semibold">Checking every airport combination…</p>
          <p className="text-muted">This takes 10–40 seconds with live prices.</p>
          <div className="mt-4 h-2 overflow-hidden rounded bg-ground"><div className="h-2 w-1/3 animate-pulse rounded bg-accent" /></div>
        </div>
      )}
      {error && <p role="alert" className="rounded-xl bg-[#fff4e6] px-4 py-3 text-[#5c3000]">{error}</p>}

      {data && (
        <>
          {data.provider === "mock" && (
            <p className="rounded-xl bg-warm px-4 py-3 text-sm font-semibold text-warm-ink">Demo mode: these are sample fares, not live prices. Add a Duffel live token to see real fares.</p>
          )}
          {data.baseline && sorted.length > 0 && data.baseline.total - sorted[0].total > 1 && sort === "cheap" && (
            <div className="rounded-xl border border-[#b5dad7] bg-accent-soft px-4 py-3.5 text-[15px] text-[#0b3d3b]">
              <strong>{money(data.baseline.total - sorted[0].total, data.currency)} cheaper</strong> than the usual search ({data.baseline.label}), once trains, buses and bag fees are counted.
            </div>
          )}
          {data.failedCalls > 0 && (
            <p className="text-sm text-muted">{data.failedCalls} of {data.callsMade} lookups failed, so a few routes may be missing.</p>
          )}
          {sorted.length === 0 && <p className="rounded-xl bg-white p-6">No flights found for these dates. Try other dates or more airports.</p>}

          <div className="flex flex-wrap items-start gap-5">
            <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-3">
              {sorted.slice(0, shown).map((t) => (
                <TripCard key={t.id} t={t} currency={data.currency} open={open === t.id} onToggle={() => setOpen(open === t.id ? null : t.id)}
                  tag={t.id === cheapestId ? "Cheapest" : t.id === fastestId ? "Fastest" : ""} bags={input.bags} studyName={study.name} homeName={home.name}
                  input={input} signedIn={signedIn} q={q} />
              ))}
              {shown < sorted.length && (
                <button onClick={() => setShown(shown + 10)} className="self-center rounded-xl border-2 border-ink bg-white px-5 py-3 font-semibold">Show more</button>
              )}
            </div>
            <Matrix data={data} />
          </div>
          <p className="text-xs text-muted">
            {data.callsMade} lookups via {data.provider === "duffel" ? "Duffel" : "demo data"}. Currency rates: {data.fxLive ? "ECB daily" : "approximate fallback"}.
          </p>
        </>
      )}
    </div>
  );
}

function compact(v: number): string {
  return v >= 10000 ? `${Math.round(v / 1000)}k` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v));
}

function Matrix({ data }: { data: SearchResult }) {
  const vals = data.matrix.cells.flat().filter((v): v is number => v != null);
  const mn = Math.min(...vals), mx = Math.max(...vals);
  return (
    <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-2xl border border-line bg-white p-4">
      <h2 className="text-base font-bold">Cheapest total by airport pair</h2>
      <p className="text-sm text-muted">Rows: where you fly out from. Columns: where you land. Darker is cheaper.</p>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-center text-[13px]">
          <thead><tr><th scope="col"><span className="sr-only">From</span></th>{data.matrix.dests.map((d) => <th key={d} scope="col" className="font-bold text-[#3a4552]">{d}</th>)}</tr></thead>
          <tbody>
            {data.matrix.origins.map((o, i) => (
              <tr key={o}>
                <th scope="row" className="pr-1 text-left font-bold text-[#3a4552]">{o}</th>
                {data.matrix.cells[i].map((v, j) => {
                  const t = v == null || mx === mn ? 0 : (v - mn) / (mx - mn);
                  return (
                    <td key={j} className="h-10 rounded-lg font-semibold" style={{ background: v == null ? "#eef1f4" : `hsl(176 42% ${Math.round(68 + t * 28)}%)` }}>
                      {v == null ? "–" : compact(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Door-to-door totals in {data.currency} (k = thousand).</p>
    </aside>
  );
}

function legSteps(leg: TripLeg, ground: (amount: number) => string) {
  const s = leg.slice;
  return [
    { title: leg.groundStart.from, note: `${leg.groundStart.mode} to ${leg.groundStart.to} · ${duration(leg.groundStart.minutes)}${leg.groundStart.estimated ? " (estimate)" : ""}`, cost: ground(leg.groundStart.cost) },
    { title: `${s.origin} ${clock(s.departAt)} → ${s.destination} ${clock(s.arriveAt)}`, note: `${s.stops === 0 ? "Direct" : `${s.stops} stop${s.stops > 1 ? "s" : ""} via ${s.via.join(", ")}`} · ${duration(s.durationMin)} · ${s.carriers.join(", ")} · ${s.checkedBags} checked bag${s.checkedBags === 1 ? "" : "s"} incl.`, cost: "" },
    { title: leg.groundEnd.to, note: `${leg.groundEnd.mode} from ${leg.groundEnd.from} · ${duration(leg.groundEnd.minutes)}${leg.groundEnd.estimated ? " (estimate)" : ""}`, cost: ground(leg.groundEnd.cost) },
  ];
}

function TripCard(props: {
  t: Trip; currency: string; open: boolean; onToggle: () => void; tag: string; bags: number;
  studyName: string; homeName: string; input: SearchInput; signedIn: boolean; q: string;
}) {
  const { t, currency, open, onToggle, tag } = props;
  const g = (amount: number) => money(amount, currency);
  return (
    <article className="rounded-2xl border border-line bg-white">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left">
        <span className="flex min-w-0 flex-[1_1_340px] flex-col gap-2.5">
          <span className="flex flex-wrap items-center gap-2">
            {tag && <span className="rounded-full bg-warm px-2.5 py-1 text-xs font-bold text-warm-ink">{tag}</span>}
            <span className="rounded-full bg-[#eef1f4] px-2.5 py-1 text-xs font-semibold text-[#3a4552]">{TICKET[t.kind]}</span>
            <span className="rounded-full bg-[#eef1f4] px-2.5 py-1 text-xs font-semibold text-[#3a4552]">
              {t.bagsIncluded >= props.bags ? `${t.bagsIncluded} bag${t.bagsIncluded === 1 ? "" : "s"} included` : `${t.bagsIncluded} incl. · extra priced in`}
            </span>
          </span>
          <span className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-[15px]">
            <span className="text-sm font-semibold text-muted">Out {shortDate(t.out.date)}</span>
            <span><strong className="font-display text-[17px]">{t.out.slice.origin} → {t.out.slice.destination}</strong> <span className="text-muted">· {t.out.slice.stops ? `via ${t.out.slice.via.join(", ")}` : "direct"} · {duration(t.out.slice.durationMin)}</span></span>
            <span className="text-sm font-semibold text-muted">Back {shortDate(t.back.date)}</span>
            <span><strong className="font-display text-[17px]">{t.back.slice.origin} → {t.back.slice.destination}</strong> <span className="text-muted">· {t.back.slice.stops ? `via ${t.back.slice.via.join(", ")}` : "direct"} · {duration(t.back.slice.durationMin)}</span></span>
          </span>
        </span>
        <span className="flex flex-col items-end gap-1">
          <span className="font-display text-2xl font-bold">{money(t.total, currency)}</span>
          <span className="text-sm text-muted">flights {money(t.flight + t.bagFee, currency)} + ground {money(t.groundAbroad + t.groundHome, currency)}</span>
          <span className="text-sm text-muted">{duration(t.avgMin)} door to door each way (avg.)</span>
        </span>
      </button>
      {open && <TripDetail {...props} g={g} />}
    </article>
  );
}

function TripDetail(props: { t: Trip; currency: string; studyName: string; homeName: string; input: SearchInput; signedIn: boolean; q: string; g: (amount: number) => string }) {
  const { t, currency, g } = props;
  const [target, setTarget] = useState<string>(String(Math.floor((t.total * 0.92) / 10) * 10));
  const [alertState, setAlertState] = useState<"idle" | "saving" | "saved" | string>("idle");

  const saveAlert = async () => {
    setAlertState("saving");
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: props.input, startPrice: t.total, targetPrice: target ? Number(target) : null }),
    });
    const body = await res.json().catch(() => ({}));
    setAlertState(res.ok ? "saved" : body.error ?? "Could not save the alert.");
  };

  const rows = [
    [`Flights (${TICKET[t.kind].toLowerCase()})`, money(t.flight, currency)],
    ["Extra checked bags (estimate)", money(t.bagFee, currency)],
    [`Ground near ${props.studyName}`, money(t.groundAbroad, currency)],
    [`Ground near ${props.homeName}`, money(t.groundHome, currency)],
  ];

  return (
    <div className="flex flex-wrap gap-5 border-t border-line p-5">
      <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-5">
        {[["Going home", t.out], ["Coming back", t.back]].map(([title, leg]) => (
          <section key={title as string} className="flex flex-col gap-3">
            <h3 className="font-bold">{title as string} · {shortDate((leg as TripLeg).date)} · {duration((leg as TripLeg).doorToDoorMin)} door to door</h3>
            {legSteps(leg as TripLeg, g).map((s, i) => (
              <div key={i} className="grid grid-cols-[14px_minmax(0,1fr)_auto] items-start gap-3">
                <span className="mt-1 h-3 w-3 rounded-full border-[3px] border-accent" aria-hidden="true" />
                <span className="flex flex-col"><strong className="text-[15px]">{s.title}</strong><span className="text-sm text-muted">{s.note}</span></span>
                <span className="text-sm font-semibold">{s.cost}</span>
              </div>
            ))}
          </section>
        ))}
        {t.kind === "separate" && (
          <p className="rounded-xl border border-[#f2cfa4] bg-[#fff4e6] px-4 py-3 text-sm text-[#5c3000]">
            Two separate tickets: if your outbound flight is cancelled, the return airline doesn&apos;t have to change your return. That&apos;s fine for a round trip, but book both with care.
          </p>
        )}
      </div>
      <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-xl bg-ground p-4">
          {rows.map(([l, v]) => <div key={l} className="flex justify-between gap-3 text-[15px]"><span className="text-[#3a4552]">{l}</span><span className="font-semibold">{v}</span></div>)}
          <div className="flex justify-between gap-3 border-t border-line pt-2 text-[17px] font-bold"><span>Total</span><span>{money(t.total, currency)}</span></div>
        </div>
        {t.bookUrls.map((u, i) => (
          <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center rounded-xl border-2 border-ink bg-white font-bold text-ink hover:bg-ground">
            {t.bookUrls.length > 1 ? (i === 0 ? "Check outbound flight ↗" : "Check return flight ↗") : "Check and book ↗"}
          </a>
        ))}
        <div className="flex flex-col gap-2 rounded-xl border border-line p-4">
          <label htmlFor={`t-${t.id}`} className="text-sm font-semibold text-muted">Email me when this trip drops to ({currency})</label>
          <input id={`t-${t.id}`} inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))} className="h-11 rounded-lg border border-[#c4ccd4] px-3" />
          {props.signedIn ? (
            <button onClick={saveAlert} disabled={alertState === "saving" || alertState === "saved"} className="h-11 rounded-lg bg-accent font-bold text-white hover:bg-accent-dark disabled:opacity-70">
              {alertState === "saved" ? "✓ Alert set" : alertState === "saving" ? "Saving…" : "Set price alert"}
            </button>
          ) : (
            <Link href={`/signin?callbackUrl=${encodeURIComponent(`/results?q=${props.q}`)}`} className="flex h-11 items-center justify-center rounded-lg bg-accent font-bold text-white">Sign in to set an alert</Link>
          )}
          {alertState !== "idle" && alertState !== "saving" && alertState !== "saved" && <p role="alert" className="text-sm text-[#8a2b00]">{alertState}</p>}
          {alertState === "saved" && <p className="text-sm text-[#0b3d3b]">We check daily across all your airports. <Link href="/alerts" className="underline">Manage alerts</Link></p>}
        </div>
      </aside>
    </div>
  );
}
