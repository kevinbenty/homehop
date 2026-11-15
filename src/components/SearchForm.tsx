"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CURRENCIES, Currency } from "@/lib/fx";
import { groundLeg } from "@/lib/ground";
import { airportsNear, defaultAirports, findCity, HOME_CITIES, STUDY_CITIES } from "@/lib/places";
import { duration } from "@/lib/format";
import { encodeQuery, estimateCalls, MAX_CALLS, SearchInput, shiftDate } from "@/lib/search-input";

const MAX_AIRPORTS = 6;
const DEFAULT_RADIUS = 550;

function defaultDates(): { out: string; ret: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const today = now.toISOString().slice(0, 10);
  if (today < `${y}-12-10`) return { out: `${y}-12-19`, ret: `${y + 1}-01-11` };
  return { out: shiftDate(today, 30), ret: shiftDate(today, 53) };
}

function nearestCodes(cityId: string, radius: number): string[] {
  const c = findCity(cityId);
  return c ? defaultAirports(c, radius, MAX_AIRPORTS) : [];
}

const field = "h-12 rounded-xl border border-[#c4ccd4] bg-white px-3 text-base text-ink";
const label = "text-sm font-semibold text-muted";

export default function SearchForm({ initial }: { initial: SearchInput | null }) {
  const router = useRouter();
  const d = defaultDates();
  const [studyCity, setStudyCity] = useState(initial?.studyCity ?? "gothenburg");
  const [homeCity, setHomeCity] = useState(initial?.homeCity ?? "thrissur");
  const [studyRadius, setStudyRadius] = useState(DEFAULT_RADIUS);
  const [homeRadius, setHomeRadius] = useState(DEFAULT_RADIUS);
  const [origins, setOrigins] = useState<string[]>(initial?.origins ?? nearestCodes("gothenburg", DEFAULT_RADIUS));
  const [dests, setDests] = useState<string[]>(initial?.dests ?? nearestCodes("thrissur", DEFAULT_RADIUS));
  const [outDate, setOutDate] = useState(initial?.outDate ?? d.out);
  const [retDate, setRetDate] = useState(initial?.retDate ?? d.ret);
  const [flexDays, setFlexDays] = useState(initial?.flexDays ?? 0);
  const [mix, setMix] = useState(initial?.mix ?? true);
  const [bags, setBags] = useState(initial?.bags ?? 2);
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "SEK");
  const [error, setError] = useState<string | null>(null);

  const study = findCity(studyCity)!;
  const home = findCity(homeCity)!;
  const nearStudy = useMemo(() => airportsNear(study, studyRadius), [study, studyRadius]);
  const nearHome = useMemo(() => airportsNear(home, homeRadius), [home, homeRadius]);
  const calls = estimateCalls({ origins, dests, flexDays, mix });

  const toggle = (list: string[], set: (v: string[]) => void, code: string) => {
    if (list.includes(code)) {
      if (list.length > 1) set(list.filter((c) => c !== code));
    } else if (list.length < MAX_AIRPORTS) set([...list, code]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (retDate <= outDate) return setError("Your return date must be after your departure date.");
    if (outDate <= new Date().toISOString().slice(0, 10)) return setError("Pick a departure date in the future.");
    if (calls > MAX_CALLS) return setError(`This search is too big (${calls} lookups, limit ${MAX_CALLS}). Remove an airport or a flexible day.`);
    const input: SearchInput = { studyCity, homeCity, origins, dests, outDate, retDate, flexDays, mix, bags, currency };
    router.push(`/results?q=${encodeQuery(input)}`);
  };

  const chip = (on: boolean) =>
    `flex min-h-24 flex-col items-start gap-0.5 rounded-xl border-2 px-3.5 py-3 text-left transition ${
      on ? "border-accent bg-accent text-white" : "border-[#c4ccd4] bg-white text-[#3a4552] hover:border-accent"
    }`;

  const airportGrid = (
    title: string,
    hint: string,
    list: ReturnType<typeof airportsNear>,
    selected: string[],
    set: (v: string[]) => void,
    groundFor: (code: string) => string,
  ) => (
    <fieldset className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <legend className="text-lg font-bold">{title}</legend>
        <span className="text-sm text-muted">{hint}</span>
      </div>
      {list.length === 0 ? (
        <p className="text-muted">No airports in range. Increase the distance.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2.5">
          {list.map((a) => {
            const on = selected.includes(a.code);
            return (
              <button key={a.code} type="button" aria-pressed={on} onClick={() => toggle(selected, set, a.code)} className={chip(on)}>
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="font-display text-xl font-bold">{a.code}</span>
                  <span className="text-xs font-semibold">{on ? "✓ Included" : "Add"}</span>
                </span>
                <span className="text-[15px] font-semibold">{a.city}</span>
                <span className="text-sm">{groundFor(a.code)}</span>
              </button>
            );
          })}
        </div>
      )}
      <p className="text-sm text-muted">{selected.length} of max {MAX_AIRPORTS} selected</p>
    </fieldset>
  );

  const groundText = (cityObj: typeof study) => (code: string) => {
    const a = nearStudy.concat(nearHome).find((x) => x.code === code)!;
    const g = groundLeg(cityObj, a);
    return `${g.mode} · ${duration(g.minutes)}${g.estimated ? " (est.)" : ""}`;
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6 rounded-2xl border border-line bg-white p-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="study" className={label}>I study in</label>
          <select id="study" className={field} value={studyCity} onChange={(e) => { setStudyCity(e.target.value); setOrigins(nearestCodes(e.target.value, studyRadius)); }}>
            {STUDY_CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="home" className={label}>Home is</label>
          <select id="home" className={field} value={homeCity} onChange={(e) => { setHomeCity(e.target.value); setDests(nearestCodes(e.target.value, homeRadius)); }}>
            {HOME_CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="out" className={label}>Leave on</label>
          <input id="out" type="date" className={field} value={outDate} onChange={(e) => setOutDate(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ret" className={label}>Come back on</label>
          <input id="ret" type="date" className={field} value={retDate} onChange={(e) => setRetDate(e.target.value)} required />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="sr" className={label}>Airports up to {studyRadius} km from {study.name}</label>
        <input id="sr" type="range" min={50} max={800} step={25} value={studyRadius} onChange={(e) => setStudyRadius(Number(e.target.value))} className="accent-[#0e6b68]" />
      </div>
      {airportGrid("Airports I can leave from", `Travel time from ${study.name}`, nearStudy, origins, setOrigins, groundText(study))}

      <div className="flex flex-col gap-2">
        <label htmlFor="hr" className={label}>Airports up to {homeRadius} km from {home.name}</label>
        <input id="hr" type="range" min={50} max={800} step={25} value={homeRadius} onChange={(e) => setHomeRadius(Number(e.target.value))} className="accent-[#0e6b68]" />
      </div>
      {airportGrid("Airports I can land at", `Onward time to ${home.name}`, nearHome, dests, setDests, groundText(home))}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="flex" className={label}>Flexible dates</label>
          <select id="flex" className={field} value={flexDays} onChange={(e) => setFlexDays(Number(e.target.value))}>
            <option value={0}>Exact dates</option>
            <option value={1}>± 1 day</option>
            <option value={2}>± 2 days</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bags" className={label}>Checked bags</label>
          <select id="bags" className={field} value={bags} onChange={(e) => setBags(Number(e.target.value))}>
            <option value={0}>None</option>
            <option value={1}>1 × 23 kg</option>
            <option value={2}>2 × 23 kg</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cur" className={label}>Show prices in</label>
          <select id="cur" className={field} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3.5 ${mix ? "border-accent bg-accent-soft" : "border-[#c4ccd4]"}`}>
        <input type="checkbox" checked={mix} onChange={(e) => setMix(e.target.checked)} className="mt-1 h-5 w-5 accent-[#0e6b68]" />
        <span className="flex flex-col">
          <span className="font-semibold">Mix airports</span>
          <span className="text-sm text-muted">Fly out of one airport and back into another, at either end.</span>
        </span>
      </label>

      {error && <p role="alert" className="rounded-xl bg-[#fff4e6] px-4 py-3 text-[#5c3000]">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e6eaee] pt-5">
        <span className={`text-[15px] ${calls > MAX_CALLS ? "font-semibold text-[#8a2b00]" : "text-muted"}`}>
          {origins.length} × {dests.length} airports{flexDays ? `, ±${flexDays} days` : ""}{mix ? ", mixed" : ""} · about {calls} flight lookups
        </span>
        <button type="submit" className="h-13 rounded-xl bg-accent px-7 py-3.5 text-[17px] font-bold text-white hover:bg-accent-dark">
          Find my cheapest way home
        </button>
      </div>
    </form>
  );
}
