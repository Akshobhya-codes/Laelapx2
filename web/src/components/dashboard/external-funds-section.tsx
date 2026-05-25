"use client";

import { motion } from "framer-motion";
import { Reveal } from "@/components/motion/reveal";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { LogoSpinner } from "@/components/motion/logo-spinner";
import type { ExternalFundMatch } from "@/lib/external-funds/types";

export function ExternalFundsSection({
  matches,
}: {
  matches: ExternalFundMatch[];
}) {
  if (matches.length === 0) return null;

  return (
    <section className="mt-20">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
              04 — VCs across the web
            </div>
            <h2 className="text-[clamp(28px,3.4vw,40px)] font-extrabold leading-[1.05] tracking-[-0.02em] text-navy">
              VCs anywhere whose thesis fits yours. Apply directly.
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-soft">
              We scraped the web for funds matching your stage and sectors and
              ranked them by fit. These funds aren&apos;t on Laelapx — submit
              your deck through each one&apos;s own application form.
            </p>
          </div>
        </div>
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((m, i) => (
          <Reveal key={`${m.fund.fundName}-${i}`} delay={i * 0.05}>
            <ExternalFundCard match={m} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function ExternalFundCard({ match }: { match: ExternalFundMatch }) {
  const { fund, fitScore, reasons } = match;
  const partnerLine = [fund.partnerName, fund.partnerTitle]
    .filter(Boolean)
    .join(" · ");
  const sourceHost = (() => {
    try {
      return new URL(fund.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex h-full flex-col rounded-xl border border-dashed border-ink/15 bg-paper-2/40 p-6"
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="text-[16px] font-extrabold tracking-tight text-navy">
            {fund.fundName}
          </div>
          {partnerLine && (
            <div className="text-[12px] text-ink-faint">{partnerLine}</div>
          )}
        </div>
        <FitBadge value={fitScore} />
      </div>

      <p className="mb-4 text-[13px] italic leading-[1.55] text-ink-soft">
        “{fund.thesisOneLiner}”
      </p>

      {reasons.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {reasons.map((r, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12px] leading-[1.55] text-ink-soft"
            >
              <span className="mt-[5px] h-1 w-1 flex-shrink-0 rounded-full bg-blue" />
              {r}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink/8 pt-4 text-[10px] uppercase tracking-[0.15em]">
        {fund.hq && <span className="text-ink-faint">{fund.hq}</span>}
        {fund.hq && fund.stages.length > 0 && (
          <span className="text-ink-faint">·</span>
        )}
        {fund.stages.length > 0 && (
          <span className="text-ink-faint">{fund.stages.join(" / ")}</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {fund.applyUrl ? (
          <a
            href={fund.applyUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1 rounded-md bg-navy px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-blue"
          >
            Apply at {sourceHost} ↗
          </a>
        ) : (
          <a
            href={fund.websiteUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1 rounded-md border border-ink/15 bg-white px-3 py-2 text-[12px] font-bold text-ink transition-colors hover:border-blue/40 hover:text-blue"
          >
            Visit {sourceHost} ↗
          </a>
        )}
      </div>

      <div className="mt-3 text-[10px] uppercase tracking-[0.15em] text-ink-faint">
        Public info · not affiliated with Laelapx
      </div>
    </motion.div>
  );
}

function FitBadge({ value }: { value: number }) {
  const tone =
    value >= 85
      ? "border-flag-green/30 bg-flag-green/8 text-flag-green"
      : value >= 65
      ? "border-blue/30 bg-blue/8 text-blue"
      : "border-ink/10 bg-paper text-ink-faint";
  return (
    <div
      className={`flex flex-col items-end rounded-md border px-2.5 py-1 ${tone}`}
    >
      <span className="text-[15px] font-extrabold leading-none tabular-nums">
        <AnimatedNumber value={value} />
        <span className="text-[10px] font-bold opacity-70">%</span>
      </span>
      <span className="text-[8px] font-bold uppercase tracking-[0.15em] opacity-75">
        Fit
      </span>
    </div>
  );
}

export function ExternalFundsSkeleton() {
  return (
    <section className="mt-20">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
        04 — VCs across the web
      </div>
      <div className="rounded-2xl border border-dashed border-ink/15 bg-paper-2/40 px-6 py-16">
        <LogoSpinner size={64} label="Scraping the web for matching funds…" />
      </div>
    </section>
  );
}
