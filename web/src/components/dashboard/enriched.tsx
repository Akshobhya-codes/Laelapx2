"use client";

import { use } from "react";
import { motion } from "framer-motion";
import type { Enrichment } from "@/lib/scoring/llm-narrative";
import type { Gap } from "@/lib/scoring/rubric";
import { Reveal } from "@/components/motion/reveal";
import { GapsSection, SectionTitle } from "./dashboard";

/* ─── NARRATIVE BLOCK ─────────────────────────────────────────────────── */
export function NarrativeBlock({
  promise,
}: {
  promise: Promise<Enrichment>;
}) {
  const enrichment = use(promise);
  if (!enrichment.narrative) return null; // fail-soft: hide if LLM failed
  return <NarrativeCard narrative={enrichment.narrative} />;
}

function NarrativeCard({ narrative }: { narrative: string }) {
  return (
    <Reveal>
      <section className="mt-12 overflow-hidden rounded-2xl border border-blue/20 bg-gradient-to-br from-blue/[0.05] via-paper to-paper p-7 sm:p-9">
        <div className="mb-4 flex items-center gap-2">
          <SparkleSpinner />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue">
            AI snapshot summary
          </span>
        </div>
        <p className="text-[clamp(18px,2vw,23px)] font-medium leading-[1.5] text-ink">
          {narrative}
        </p>
      </section>
    </Reveal>
  );
}

/* ─── GAPS BLOCK ──────────────────────────────────────────────────────── */
/**
 * Priority for the gaps shown to the founder:
 *   1. snapshot.gaps from the LLM scorer (derived from per-sub-criterion
 *      ratings ≤ 3, with the rubric tier above's "what good looks like"
 *      becoming the closing). Always passed as `fallbackGaps`.
 *   2. Legacy narrative-pass gaps (only used if the scorer wasn't run,
 *      which only happens on the deterministic-fallback path).
 *
 * In practice the snapshot.gaps are now richer than the narrative ones,
 * so we prefer them when present — the narrative pass is becoming a
 * pure summary-paragraph generator.
 */
export function GapsBlock({
  promise,
  fallbackGaps,
}: {
  promise: Promise<Enrichment>;
  fallbackGaps: Gap[];
}) {
  const enrichment = use(promise);
  const gaps =
    fallbackGaps.length > 0
      ? fallbackGaps
      : enrichment.gaps && enrichment.gaps.length > 0
      ? enrichment.gaps
      : [];
  return <GapsSection gaps={gaps} />;
}

/* ─── SKELETONS ───────────────────────────────────────────────────────── */
export function NarrativeSkeleton() {
  return (
    <section className="mt-12 rounded-2xl border border-blue/20 bg-white p-7 sm:p-9">
      <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-blue">
        <SparkleSpinner />
        Generating snapshot summary…
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-ink/8" />
        <div className="h-4 w-[92%] animate-pulse rounded bg-ink/8" />
        <div className="h-4 w-[68%] animate-pulse rounded bg-ink/8" />
      </div>
    </section>
  );
}

export function GapsSkeleton() {
  return (
    <section className="mt-20">
      <SectionTitle
        eyebrow="02 — Gap analysis"
        title="Reading your submission for the gaps that would cause a pass."
      />
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonGapCard key={i} delay={i * 0.08} />
        ))}
      </div>
    </section>
  );
}

function SkeletonGapCard({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl border border-ink/10 bg-white p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="h-5 w-14 animate-pulse rounded-full bg-ink/8" />
        <div className="h-3 w-20 animate-pulse rounded bg-ink/8" />
      </div>
      <div className="h-5 w-3/4 animate-pulse rounded bg-ink/10" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-ink/8" />
        <div className="h-3 w-[90%] animate-pulse rounded bg-ink/8" />
        <div className="h-3 w-[78%] animate-pulse rounded bg-ink/8" />
      </div>
      <div className="mt-4 rounded-md bg-paper p-3">
        <div className="h-3 w-full animate-pulse rounded bg-ink/8" />
        <div className="mt-2 h-3 w-[85%] animate-pulse rounded bg-ink/8" />
      </div>
    </motion.div>
  );
}

/* ─── SPARKLE SPINNER ─────────────────────────────────────────────────── */
function SparkleSpinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ duration: 4, ease: "linear", repeat: Infinity }}
      className="inline-flex h-3.5 w-3.5 items-center justify-center text-blue"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full">
        <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" />
      </svg>
    </motion.span>
  );
}
