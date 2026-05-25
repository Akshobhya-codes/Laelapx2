"use client";

import { motion } from "framer-motion";
import { Reveal } from "@/components/motion/reveal";
import { LogoSpinner } from "@/components/motion/logo-spinner";
import type { MarketSignal } from "@/lib/market-signals/match";

const TAG_TONE: Record<
  MarketSignal["tag"],
  { dot: string; chip: string; label: string }
> = {
  funding: {
    dot: "bg-flag-green",
    chip:
      "border-flag-green/30 bg-flag-green/8 text-flag-green",
    label: "Funding",
  },
  competitor: {
    dot: "bg-flag-amber",
    chip:
      "border-flag-amber/30 bg-flag-amber/8 text-flag-amber",
    label: "Competitor",
  },
  trend: {
    dot: "bg-blue",
    chip: "border-blue/30 bg-blue/8 text-blue",
    label: "Trend",
  },
  regulation: {
    dot: "bg-flag-red",
    chip: "border-flag-red/30 bg-flag-red/8 text-flag-red",
    label: "Regulation",
  },
};

export function MarketSignalsSection({
  signals,
}: {
  signals: MarketSignal[];
}) {
  if (signals.length === 0) return null;
  return (
    <section className="mt-20">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
              Live market signal
            </div>
            <h2 className="text-[clamp(24px,3vw,36px)] font-extrabold leading-[1.05] tracking-[-0.02em] text-navy">
              What&apos;s moving in your sector right now.
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-soft">
              Pulled live from the web against your stage and sectors. Refreshed
              weekly.
            </p>
          </div>
        </div>
      </Reveal>
      <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
        {signals.map((s, i) => (
          <Reveal key={`${s.headline}-${i}`} delay={i * 0.06}>
            <SignalCard signal={s} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function SignalCard({ signal }: { signal: MarketSignal }) {
  const tone = TAG_TONE[signal.tag];
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex h-full flex-col rounded-xl border border-ink/10 bg-white p-6"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] ${tone.chip}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          {tone.label}
        </span>
        {signal.sourceName && (
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-faint">
            via {signal.sourceName}
          </span>
        )}
      </div>
      <div className="text-[16px] font-extrabold leading-snug tracking-[-0.01em] text-navy">
        {signal.headline}
      </div>
      <p className="mt-2 text-[13px] leading-[1.55] text-ink-soft">
        {signal.why}
      </p>
      {signal.sourceUrl && (
        <a
          href={signal.sourceUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-4 inline-block text-[12px] font-bold text-blue transition-colors hover:text-blue-light"
        >
          Read source ↗
        </a>
      )}
    </motion.div>
  );
}

export function MarketSignalsSkeleton() {
  return (
    <section className="mt-20">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
        Live market signal
      </div>
      <div className="rounded-2xl border border-dashed border-ink/15 bg-paper-2/40 px-6 py-14">
        <LogoSpinner size={48} label="Pulling sector intel…" />
      </div>
    </section>
  );
}
