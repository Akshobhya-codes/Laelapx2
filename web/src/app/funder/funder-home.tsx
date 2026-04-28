"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal } from "@/components/motion/reveal";
import { AnimatedNumber, formatUsdShort } from "@/components/motion/animated-number";
import { FunderNav } from "./discover/discover";

type Thesis = {
  fundName: string;
  partnerName?: string;
  thesisOneLiner: string;
  stages: string[];
  sectors: string[];
};

type Match = {
  slug: string;
  name: string;
  oneLiner: string;
  fit: number;
  stage: string;
  raisingUsd: number;
  roundType: string;
};

export function FunderHome({
  displayName,
  profileImageUrl,
  thesis,
  stats,
  topMatches,
}: {
  displayName: string | null;
  profileImageUrl: string | null;
  thesis: Thesis | null;
  stats: { totalLive: number; strongFit: number };
  topMatches: Match[];
}) {
  const firstName = displayName?.split(" ")[0] || "you";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <FunderNav firstName={firstName} profileImageUrl={profileImageUrl} />

      <header className="border-b border-ink/8 bg-paper-2 px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue mb-3">
              Investor workspace
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="text-[clamp(40px,5.5vw,72px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-navy">
              {thesis ? (
                <>
                  Welcome back, <span className="text-blue">{firstName}</span>.
                </>
              ) : (
                <>
                  Welcome, <span className="text-blue">{firstName}</span>.
                </>
              )}
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
              {thesis ? (
                <>
                  We&apos;re scoring every incoming submission against your
                  thesis. Below: top matches, recent activity, and quick
                  actions.
                </>
              ) : (
                <>
                  Define your thesis once. We&apos;ll filter every founder
                  submission against it — and surface only the ones that fit.
                </>
              )}
            </p>
          </Reveal>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-14">
        {!thesis ? (
          <NoThesisCTA />
        ) : (
          <>
            {/* Stats row */}
            <Reveal>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                  label="Live submissions"
                  value={stats.totalLive}
                  helper="Across all founders on Laelapx"
                />
                <StatCard
                  label="Strong-fit matches"
                  value={stats.strongFit}
                  helper="≥ 65% match against your thesis"
                  highlight
                />
                <StatCard
                  label="Saved + connect"
                  value={0}
                  helper="Coming soon"
                  muted
                />
              </div>
            </Reveal>

            {/* Thesis card */}
            <Reveal delay={0.1}>
              <section className="mt-12 rounded-2xl border border-ink/10 bg-white p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue mb-2">
                      Your thesis
                    </div>
                    <div className="text-[24px] font-extrabold tracking-tight text-navy">
                      {thesis.fundName}
                    </div>
                    {thesis.partnerName && (
                      <div className="text-[13px] text-ink-faint">
                        {thesis.partnerName}
                      </div>
                    )}
                  </div>
                  <Link
                    href="/funder/thesis"
                    className="text-[13px] font-semibold text-blue transition-colors hover:text-blue-light"
                  >
                    Edit thesis →
                  </Link>
                </div>
                <p className="mt-5 max-w-2xl text-[15px] italic leading-[1.55] text-ink-soft">
                  &ldquo;{thesis.thesisOneLiner}&rdquo;
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {thesis.stages.map((s) => (
                    <Tag key={s}>{s}</Tag>
                  ))}
                  {thesis.sectors.slice(0, 6).map((s) => (
                    <Tag key={s} muted>
                      {s}
                    </Tag>
                  ))}
                </div>
              </section>
            </Reveal>

            {/* Top matches */}
            <Reveal delay={0.2}>
              <section className="mt-12">
                <div className="mb-5 flex items-baseline justify-between">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue mb-2">
                      Top matches
                    </div>
                    <h2 className="text-[clamp(24px,3vw,32px)] font-extrabold tracking-tight text-navy">
                      Highest-fit startups right now.
                    </h2>
                  </div>
                  <Link
                    href="/funder/discover"
                    className="text-[13px] font-bold text-blue transition-colors hover:text-blue-light"
                  >
                    Browse all →
                  </Link>
                </div>

                {topMatches.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-white p-10 text-center">
                    <div className="text-[14px] text-ink">
                      No submissions yet. Once founders submit, matches appear
                      here.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {topMatches.map((m, i) => (
                      <Reveal key={m.slug} delay={i * 0.05}>
                        <MatchCard match={m} />
                      </Reveal>
                    ))}
                  </div>
                )}
              </section>
            </Reveal>
          </>
        )}
      </main>
    </div>
  );
}

/* ─── EMPTY STATE: NO THESIS ──────────────────────────────────────────── */
function NoThesisCTA() {
  return (
    <Reveal>
      <div className="overflow-hidden rounded-2xl border border-blue/30 bg-gradient-to-br from-blue/[0.06] via-paper to-paper p-10 sm:p-14">
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="grid h-14 w-14 place-items-center rounded-2xl border border-blue/30 bg-white text-[24px] text-blue"
        >
          ✦
        </motion.div>
        <h2 className="mt-7 max-w-xl text-[clamp(28px,3.5vw,42px)] font-extrabold leading-[1.1] tracking-[-0.025em] text-navy">
          Set your thesis first.
        </h2>
        <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink-soft">
          Stage, sector, geography, check size — define once. From then on
          every new submission gets scored against your filter and only the
          ones that fit reach you.
        </p>
        <Link
          href="/funder/thesis"
          className="mt-7 inline-flex items-center gap-2 rounded-md bg-blue px-6 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-blue-light"
        >
          Define thesis
          <span className="text-base">→</span>
        </Link>
      </div>
    </Reveal>
  );
}

/* ─── STAT CARD ───────────────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  helper,
  highlight = false,
  muted = false,
}: {
  label: string;
  value: number;
  helper: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-7 ${
        highlight
          ? "border-blue/30 bg-gradient-to-br from-blue/[0.08] via-white to-white"
          : muted
          ? "border-ink/10 bg-paper-2 opacity-70"
          : "border-ink/10 bg-white"
      }`}
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-faint">
        {label}
      </div>
      <div
        className={`mt-3 text-[clamp(36px,4vw,52px)] font-extrabold leading-none tracking-[-0.03em] tabular-nums ${
          highlight ? "text-blue" : "text-navy"
        }`}
      >
        <AnimatedNumber value={value} />
      </div>
      <div className="mt-3 text-[12px] text-ink-faint">{helper}</div>
    </div>
  );
}

/* ─── MATCH CARD ──────────────────────────────────────────────────────── */
function MatchCard({ match }: { match: Match }) {
  const initials = match.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const fitTone =
    match.fit >= 85
      ? "border-flag-green/30 bg-flag-green/10 text-flag-green"
      : match.fit >= 65
      ? "border-blue/30 bg-blue/10 text-blue"
      : "border-flag-amber/30 bg-flag-amber/10 text-flag-amber";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <Link
        href={`/s/${match.slug}`}
        className="group flex items-center gap-4 rounded-xl border border-ink/10 bg-white p-4 transition-all hover:border-blue/40"
      >
        <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue to-navy text-[13px] font-black text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-extrabold tracking-tight text-navy">
            {match.name}
          </div>
          <div className="truncate text-[12px] text-ink-soft">
            {match.oneLiner}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.15em] text-ink-faint">
            {match.stage} · {formatUsdShort(match.raisingUsd)} {match.roundType}
          </div>
        </div>
        <div
          className={`flex flex-col items-end rounded-md border px-2 py-0.5 ${fitTone}`}
        >
          <span className="text-[14px] font-extrabold leading-tight tabular-nums">
            {match.fit}
            <span className="text-[9px] font-bold opacity-70">%</span>
          </span>
          <span className="text-[7px] font-bold uppercase tracking-[0.2em] opacity-70">
            Fit
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── TAG ─────────────────────────────────────────────────────────────── */
function Tag({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
        muted ? "bg-paper-2 text-ink-faint" : "bg-blue/10 text-blue"
      }`}
    >
      {children}
    </span>
  );
}
