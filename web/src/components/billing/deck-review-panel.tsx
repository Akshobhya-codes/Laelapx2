"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";
import { ChartCard, ColumnChart } from "@/components/charts/charts";
import { runDeckReviewAction } from "@/app/actions/founder-tools";
import type { DeckReviewBody } from "@/lib/insforge/founder-tools";

/**
 * Laelapx+ founder tools on the dashboard: deep deck review (the vision
 * model reads the actual PDF) and iteration feedback (how each edit and
 * each deck revision moved the scores).
 */

export type DeckReviewView = {
  id: string;
  status: "ok" | "unreadable" | "error";
  deckScore: number | null;
  review: DeckReviewBody | null;
  error: string | null;
  createdAt: string;
};

export type HistoryPoint = {
  at: string;
  composite: number;
  sections: { id: string; name: string; score: number }[];
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function DeckReviewPanel({
  slug,
  hasDeck,
  reviews,
  remaining,
  perMonth,
}: {
  slug: string;
  hasDeck: boolean;
  reviews: DeckReviewView[];
  remaining: number;
  perMonth: number;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const ok = reviews.filter((r) => r.status === "ok");
  const latest = ok[0] ?? null;
  const previous = ok[1] ?? null;
  const lastAttempt = reviews[0] ?? null;
  const delta = latest && previous && latest.deckScore !== null && previous.deckScore !== null
    ? latest.deckScore - previous.deckScore
    : null;

  // Iteration: which of last time's fixes no longer appear in this review.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const nowTitles = new Set((latest?.review?.topFixes ?? []).map((f) => norm(f.title)));
  const resolved = previous?.review?.topFixes.filter((f) => !nowTitles.has(norm(f.title))) ?? [];

  const run = () => {
    setErr(null);
    start(async () => {
      const r = await runDeckReviewAction(slug);
      if (!r.ok) setErr(r.error);
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mt-12 rounded-2xl border border-ink/10 bg-white p-7 sm:p-9"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-blue">Deep deck review · Laelapx+</div>
          <h3 className="text-[22px] font-extrabold tracking-tight text-navy">
            {latest ? "Your deck, slide by slide." : "Have your deck read the way an investor reads it."}
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            We read every slide of the PDF against your stage, score how ready it is, and name the fixes that matter.
            Re-run after each revision to see what improved.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {hasDeck ? (
            <button
              type="button"
              disabled={pending || remaining <= 0}
              onClick={run}
              className="rounded-md bg-navy px-5 py-2.5 text-[13px] font-bold text-white hover:bg-blue disabled:opacity-60"
            >
              {pending ? "Reading your deck…" : latest ? "Review the new version" : "Review my deck"}
            </button>
          ) : (
            <Link href={`/founder/${slug}/edit`} className="rounded-md border border-navy px-5 py-2.5 text-[13px] font-bold text-navy hover:bg-navy hover:text-white">
              Add a deck link first →
            </Link>
          )}
          <span className="text-[11px] text-ink-faint">{remaining} of {perMonth} reviews left this month</span>
        </div>
      </div>

      {pending && (
        <p className="mt-5 text-[13px] text-ink-soft">This takes about a minute — the model is reading the whole PDF.</p>
      )}
      {err && <p className="mt-5 rounded-md border border-flag-red/30 bg-flag-red/5 px-4 py-3 text-[13px] text-flag-red">{err}</p>}
      {!err && lastAttempt && lastAttempt.status !== "ok" && !pending && (
        <p className="mt-5 rounded-md border border-flag-amber/30 bg-flag-amber/10 px-4 py-3 text-[13px] text-ink">
          Last attempt ({fmt(lastAttempt.createdAt)}): {lastAttempt.error}
        </p>
      )}

      {latest?.review && (
        <div className="mt-7 grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="rounded-xl bg-paper-2 p-5">
            <div className="text-[11px] font-semibold text-ink-faint">Deck readiness</div>
            <div className="mt-1 text-[48px] font-extrabold leading-none tracking-[-0.03em] text-navy">{latest.deckScore}</div>
            <div className="mt-1 text-[12px] text-ink-soft">
              out of 100 · {fmt(latest.createdAt)}
            </div>
            {delta !== null && (
              <div className={clsx("mt-3 text-[13px] font-bold", delta > 0 ? "text-flag-green" : delta < 0 ? "text-flag-red" : "text-ink-soft")}>
                {delta > 0 ? "▲" : delta < 0 ? "▼" : "■"} {delta > 0 ? "+" : ""}{delta} vs previous version
              </div>
            )}
          </div>

          <div className="space-y-5">
            <p className="text-[15px] leading-relaxed text-ink">{latest.review.summary}</p>
            {latest.review.storyline && (
              <p className="text-[13px] leading-relaxed text-ink-soft">
                <span className="font-bold text-ink">Storyline. </span>{latest.review.storyline}
              </p>
            )}

            {resolved.length > 0 && (
              <div className="rounded-lg border border-flag-green/25 bg-flag-green/[0.06] p-4">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-flag-green">Fixed since last version</div>
                <ul className="space-y-1">
                  {resolved.map((f) => (
                    <li key={f.title} className="flex gap-2 text-[13px] text-ink"><span aria-hidden="true">✓</span>{f.title}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">Top fixes</div>
              <ol className="space-y-3">
                {latest.review.topFixes.map((f, i) => (
                  <li key={f.title} className="rounded-lg border border-ink/10 p-4">
                    <div className="text-[14px] font-bold text-navy">{i + 1}. {f.title}</div>
                    <p className="mt-1 text-[13px] text-ink-soft">{f.why}</p>
                    <p className="mt-1.5 text-[13px] text-ink"><span className="font-semibold">Fix: </span>{f.fix}</p>
                  </li>
                ))}
              </ol>
            </div>

            {latest.review.missing.length > 0 && (
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">Investors will look for</div>
                <ul className="flex flex-wrap gap-1.5">
                  {latest.review.missing.map((m) => (
                    <li key={m} className="rounded-md bg-flag-amber/10 px-2.5 py-1 text-[12px] text-ink">{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {latest.review.slides.length > 0 && (
              <details className="group rounded-lg border border-ink/10">
                <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-bold text-navy">
                  Slide by slide ({latest.review.slides.length}) <span className="text-ink-faint group-open:hidden">▸</span><span className="hidden text-ink-faint group-open:inline">▾</span>
                </summary>
                <ul className="divide-y divide-ink/5 border-t border-ink/8">
                  {latest.review.slides.map((s) => (
                    <li key={`${s.index}-${s.title}`} className="flex gap-3 px-4 py-2.5 text-[13px]">
                      <span className="w-6 flex-shrink-0 tabular-nums text-ink-faint">{s.index}</span>
                      <span
                        className={clsx(
                          "mt-0.5 h-fit flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]",
                          s.verdict === "strong" && "bg-flag-green/15 text-flag-green",
                          s.verdict === "ok" && "bg-paper-2 text-ink-soft",
                          s.verdict === "weak" && "bg-flag-red/10 text-flag-red"
                        )}
                      >
                        {s.verdict}
                      </span>
                      <span className="min-w-0">
                        <span className="font-semibold text-ink">{s.title}. </span>
                        <span className="text-ink-soft">{s.note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}
    </motion.section>
  );
}

/** Iteration feedback: the fundability score across submission revisions. */
export function IterationPanel({ history }: { history: HistoryPoint[] }) {
  if (history.length === 0) return null;
  const data = history.map((h, i) => ({
    label: `v${i + 1}`,
    value: h.composite,
    detail: `Revision ${i + 1} · ${fmt(h.at)}`,
  }));
  const last = history[history.length - 1];
  const prev = history.length > 1 ? history[history.length - 2] : null;
  const prevById = new Map((prev?.sections ?? []).map((s) => [s.id, s.score]));
  const sectionDeltas = last.sections
    .map((s) => ({ name: s.name, score: s.score, delta: prevById.has(s.id) ? s.score - prevById.get(s.id)! : null }))
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));

  return (
    <div className="mt-12 grid gap-6 lg:grid-cols-2">
      <ChartCard
        title="Fundability across revisions"
        subtitle={history.length === 1 ? "Edit your submission to start a trend" : `${history.length} scored revisions`}
        data={data}
        valueLabel="Score"
      >
        <ColumnChart data={data} valueLabel="fundability score" height={150} />
      </ChartCard>

      <section className="rounded-2xl border border-ink/10 bg-white p-6">
        <h3 className="text-[15px] font-extrabold tracking-tight text-navy">What your last edit moved</h3>
        <p className="mt-0.5 text-[12px] text-ink-faint">
          {prev ? `v${history.length} vs v${history.length - 1}, by section` : "Section scores for your first scored version"}
        </p>
        <ul className="mt-4 divide-y divide-ink/5">
          {sectionDeltas.map((s) => (
            <li key={s.name} className="flex items-center justify-between py-2 text-[13px]">
              <span className="text-ink">{s.name}</span>
              <span className="flex items-center gap-3 tabular-nums">
                <span className="text-ink-soft">{s.score}</span>
                {s.delta !== null && (
                  <span
                    className={clsx(
                      "w-12 text-right text-[12px] font-bold",
                      s.delta > 0 ? "text-flag-green" : s.delta < 0 ? "text-flag-red" : "text-ink-faint"
                    )}
                  >
                    {s.delta > 0 ? "▲ +" : s.delta < 0 ? "▼ " : ""}{s.delta === 0 ? "—" : s.delta}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
