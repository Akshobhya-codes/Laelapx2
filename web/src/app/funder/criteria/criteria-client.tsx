"use client";

import { useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { FunderNav } from "@/app/funder/discover/discover";
import { Reveal } from "@/components/motion/reveal";
import { LockedSection } from "@/components/billing/locked-section";
import type { CustomCriteria } from "@/lib/insforge/investor-workspace";
import { saveCriteriaAction } from "@/app/actions/workspace";

type PoolItem = {
  launched: boolean;
  mrrUsd: number;
  customers: number;
  score: number;
  country: string;
  productStage: string;
  text: string;
};

const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const toNum = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[$,\s]/g, "")));

export function CriteriaForm({
  displayName,
  profileImageUrl,
  planBadge,
  allowed,
  initial,
  pool,
  savedKept,
  productStageOptions,
}: {
  displayName: string | null;
  profileImageUrl: string | null;
  planBadge: { name: string; tone: "neutral" | "paid" | "warn" };
  allowed: boolean;
  initial: CustomCriteria;
  pool: PoolItem[];
  savedKept: number;
  productStageOptions: string[];
}) {
  const firstName = displayName?.split(" ")[0] || "you";
  const [minMrr, setMinMrr] = useState(initial.minMrrUsd?.toString() ?? "");
  const [minCustomers, setMinCustomers] = useState(initial.minCustomers?.toString() ?? "");
  const [minScore, setMinScore] = useState(initial.minScore?.toString() ?? "");
  const [launchedOnly, setLaunchedOnly] = useState(initial.launchedOnly);
  const [countries, setCountries] = useState(initial.countries.join(", "));
  const [stages, setStages] = useState<string[]>(initial.productStages);
  const [keywords, setKeywords] = useState(initial.keywords.join(", "));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  // Live preview: same rules as lib/billing/criteria.ts, on the visible pool.
  const kept = useMemo(() => {
    const mrr = toNum(minMrr);
    const cust = toNum(minCustomers);
    const sc = toNum(minScore);
    const cs = splitList(countries).map((c) => c.toLowerCase());
    const kws = splitList(keywords).map((k) => k.toLowerCase());
    return pool.filter((p) => {
      if (launchedOnly && !p.launched) return false;
      if (mrr !== null && p.mrrUsd < mrr) return false;
      if (cust !== null && p.customers < cust) return false;
      if (sc !== null && p.score < sc) return false;
      if (cs.length && !cs.includes(p.country.trim().toLowerCase())) return false;
      if (stages.length && !stages.includes(p.productStage)) return false;
      if (kws.length && !kws.some((k) => p.text.includes(k))) return false;
      return true;
    }).length;
  }, [pool, minMrr, minCustomers, minScore, launchedOnly, countries, stages, keywords]);

  const save = () => {
    setMsg(null);
    start(async () => {
      const r = await saveCriteriaAction({
        minMrrUsd: toNum(minMrr),
        minCustomers: toNum(minCustomers),
        minScore: toNum(minScore),
        launchedOnly,
        countries: splitList(countries),
        productStages: stages,
        keywords: splitList(keywords),
      });
      setMsg(r.ok ? { ok: true, text: "Saved. Discover now screens with these." } : { ok: false, text: r.error });
    });
  };

  const clear = () => {
    setMinMrr(""); setMinCustomers(""); setMinScore(""); setLaunchedOnly(false);
    setCountries(""); setStages([]); setKeywords("");
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <FunderNav firstName={firstName} profileImageUrl={profileImageUrl} breadcrumb="Criteria" planBadge={planBadge} />

      <header className="border-b border-ink/8 bg-paper-2 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">Custom criteria</div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="text-[clamp(32px,4vw,48px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-navy">
              Screen founders before they reach you.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
              Hard filters on top of your thesis. Founders who miss any of these never show up in
              Discover or your weekly matches, so they don&apos;t cost you an unlock. Shared with your team.
            </p>
          </Reveal>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {!allowed ? (
          <LockedSection
            eyebrow="Custom criteria"
            title="Your own screening rules, applied to every founder."
            blurb="Set minimum MRR, customers, or fundability score; restrict HQ countries and product stage; require keywords. Discover and your matches respect them automatically."
            planName="Emerging Fund"
            href="/pricing?side=investor"
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <section className="space-y-5 rounded-2xl border border-ink/10 bg-white p-7">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Min MRR (USD)">
                  <input inputMode="numeric" value={minMrr} onChange={(e) => setMinMrr(e.target.value)} placeholder="e.g. 10000" className={inputCls} />
                </Field>
                <Field label="Min customers">
                  <input inputMode="numeric" value={minCustomers} onChange={(e) => setMinCustomers(e.target.value)} placeholder="e.g. 20" className={inputCls} />
                </Field>
                <Field label="Min fundability score">
                  <input inputMode="numeric" value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="0–100" className={inputCls} />
                </Field>
              </div>

              <Field label="HQ countries (comma-separated, empty = anywhere)">
                <input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="United States, Canada, United Kingdom" className={inputCls} />
              </Field>

              <Field label="Keywords (any match, comma-separated)">
                <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="payments, compliance, healthcare" className={inputCls} />
              </Field>

              <div>
                <div className={labelCls}>Product stage (empty = any)</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {productStageOptions.map((s) => {
                    const on = stages.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStages(on ? stages.filter((x) => x !== s) : [...stages, s])}
                        className={clsx(
                          "rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors",
                          on ? "border-navy bg-navy text-white" : "border-ink/10 bg-white text-ink-soft hover:border-ink/25"
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-md border border-ink/10 bg-paper px-4 py-2.5">
                <input type="checkbox" checked={launchedOnly} onChange={(e) => setLaunchedOnly(e.target.checked)} className="h-4 w-4" />
                <span className="text-[13px] font-semibold text-ink">Launched products only</span>
              </label>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={save}
                  className="rounded-md bg-navy px-5 py-2.5 text-[13px] font-bold text-white hover:bg-blue disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save criteria"}
                </button>
                <button type="button" onClick={clear} className="text-[13px] font-semibold text-ink-faint hover:text-ink">
                  Clear all
                </button>
                {msg && <span className={clsx("text-[12px]", msg.ok ? "text-flag-green" : "text-flag-red")}>{msg.text}</span>}
              </div>
            </section>

            <aside className="h-fit rounded-2xl border border-blue/25 bg-gradient-to-br from-blue/[0.06] to-white p-6 lg:sticky lg:top-28">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue">Preview</div>
              <div className="mt-2 text-[44px] font-extrabold leading-none tracking-[-0.03em] text-navy tabular-nums">{kept}</div>
              <div className="mt-1 text-[13px] text-ink-soft">
                of {pool.length} currently visible founder{pool.length === 1 ? "" : "s"} pass these criteria
              </div>
              <div className="mt-4 border-t border-ink/8 pt-3 text-[12px] text-ink-faint">
                With your saved criteria: {savedKept}
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

const labelCls = "text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint";
const inputCls =
  "mt-1.5 w-full rounded-md border border-ink/10 bg-paper px-3.5 py-2.5 text-[14px] outline-none transition-all focus:border-blue focus:ring-4 focus:ring-blue/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}
