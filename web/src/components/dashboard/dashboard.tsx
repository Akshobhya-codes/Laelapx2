"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Submission } from "@/lib/submission/schema";
import type { Snapshot, SubScore, Gap } from "@/lib/scoring/rubric";
import type { InvestorMatch } from "@/lib/investors/mock";
import { Reveal } from "@/components/motion/reveal";
import { AnimatedNumber, formatUsdShort } from "@/components/motion/animated-number";
import { NotificationsBell } from "@/components/notifications/bell";
import { SearchBar } from "@/components/search/search-bar";
import slugify from "slugify";

/**
 * DashboardShell — layout-only wrapper (nav + header + main). The page
 * server component composes the body with Suspense boundaries for the
 * streamed LLM enrichment.
 */
export function DashboardShell({
  data,
  snapshot,
  displayName,
  profileImageUrl,
  children,
}: {
  data: Submission;
  snapshot: Snapshot;
  displayName: string | null;
  profileImageUrl: string | null;
  children: React.ReactNode;
}) {
  const slug = slugify(data.companyName, { lower: true, strict: true });
  return (
    <div className="min-h-screen bg-paper text-ink">
      <CompanyHubNav
        data={data}
        slug={slug}
        displayName={displayName}
        profileImageUrl={profileImageUrl}
      />
      <Header data={data} snapshot={snapshot} />
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-2">{children}</main>
    </div>
  );
}

/* ─── COMPANY HUB NAV (with workspace breadcrumb + tabs + account) ────── */
function CompanyHubNav({
  data,
  slug,
  displayName,
  profileImageUrl,
}: {
  data: Submission;
  slug: string;
  displayName: string | null;
  profileImageUrl: string | null;
}) {
  const firstName = displayName?.split(" ")[0] || "you";
  return (
    <nav className="sticky top-0 z-20 border-b border-ink/8 bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 pt-4">
        {/* Breadcrumb */}
        <div className="flex flex-shrink-0 items-center gap-2 text-[14px]">
          <Link
            href="/"
            className="text-[16px] font-black tracking-tight text-navy"
          >
            Laelapx<span className="text-blue">.</span>
          </Link>
          <span className="text-ink-faint">/</span>
          <Link
            href="/founder"
            className="text-[12px] font-bold uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-ink"
          >
            Founder
          </Link>
          <span className="text-ink-faint">/</span>
          <span className="text-[14px] font-extrabold text-navy">
            {data.companyName}
          </span>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <SearchBar />
        </div>

        {/* Account */}
        <div className="flex flex-shrink-0 items-center gap-3">
          <Link
            href="/messages"
            className="hidden text-[12px] font-semibold text-ink-soft transition-colors hover:text-ink lg:inline"
          >
            Messages
          </Link>
          <NotificationsBell />
          <Link
            href="/welcome?switch=1"
            className="hidden text-[12px] font-semibold text-ink-faint transition-colors hover:text-ink xl:inline"
          >
            Switch role
          </Link>
          <Link
            href="/u/me"
            className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-2 py-1 transition-colors hover:border-ink/25"
          >
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImageUrl}
                alt={firstName}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-blue text-[10px] font-bold text-white">
                {firstName[0]?.toUpperCase()}
              </span>
            )}
            <span className="hidden text-[12px] font-semibold text-ink-soft sm:inline">
              {firstName}
            </span>
          </Link>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center gap-1 pt-3">
          <HubTab href={`/founder/${slug}`} active>
            Dashboard
          </HubTab>
          <HubTab href={`/founder/${slug}/edit`}>Edit submission</HubTab>
          <HubTab href={`/s/${slug}`} external>
            Public page
          </HubTab>
        </div>
      </div>
    </nav>
  );
}

function HubTab({
  href,
  active = false,
  external = false,
  children,
}: {
  href: string;
  active?: boolean;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`relative px-4 py-3 text-[13px] font-semibold transition-colors ${
        active
          ? "text-navy"
          : "text-ink-faint hover:text-ink"
      }`}
    >
      {children}
      {external && <span className="ml-1 text-[10px] opacity-60">↗</span>}
      {active && (
        <motion.span
          layoutId="hub-tab-underline"
          className="absolute -bottom-px left-0 right-0 h-[2px] bg-blue"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
    </Link>
  );
}

/* ─── HEADER ─────────────────────────────────────────────────────────── */
function Header({ data, snapshot }: { data: Submission; snapshot: Snapshot }) {
  return (
    <header className="border-b border-ink/8 bg-paper-2 px-6 py-14">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue mb-3">
            Founder dashboard
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="text-[clamp(40px,5.5vw,72px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-navy">
            Your Snapshot,{" "}
            <span className="text-blue">{data.companyName}</span>.
          </h1>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
            How your submission reads against what investors screen for, where
            the gaps are, and which investors fit your thesis right now.
          </p>
        </Reveal>

        <Reveal delay={0.25}>
          <div className="mt-9 flex flex-wrap gap-3">
            <SummaryPill
              label="Composite"
              value={`${snapshot.composite}/100`}
              tone="blue"
            />
            <SummaryPill label="Rating" value={snapshot.rating} tone="default" />
            <SummaryPill
              label="Gaps surfaced"
              value={String(snapshot.gaps.length)}
              tone="default"
            />
            <SummaryPill
              label="Stage · Round"
              value={`${data.stage} · ${formatUsdShort(data.raisingUsd)}`}
              tone="default"
            />
          </div>
        </Reveal>
      </div>
    </header>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "default";
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-full border px-4 py-2 ${
        tone === "blue"
          ? "border-blue/25 bg-blue/8"
          : "border-ink/10 bg-white"
      }`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint">
        {label}
      </span>
      <span
        className={`text-[13px] font-bold ${
          tone === "blue" ? "text-blue" : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── SCORE SECTION ──────────────────────────────────────────────────── */
export function ScoreSection({ snapshot }: { snapshot: Snapshot }) {
  return (
    <section className="mt-16">
      <Reveal>
        <SectionTitle eyebrow="01 — Score" title="Fundability Snapshot" />
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[420px_1fr]">
        <Reveal delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-ink/10 bg-white p-10">
            <ScoreGauge value={snapshot.composite} />
            <div className="mt-6 text-center">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-faint">
                Rating
              </div>
              <div className="mt-1 text-[22px] font-extrabold tracking-tight text-navy">
                {snapshot.rating}
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="rounded-2xl border border-ink/10 bg-white p-8">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-faint">
              Sub-scores
            </div>
            <div className="mt-5 space-y-5">
              {snapshot.subscores.map((s, i) => (
                <SubScoreBar key={s.axis} sub={s} delay={i * 0.08} />
              ))}
            </div>
            <div className="mt-7 flex flex-col gap-1.5 border-t border-ink/8 pt-5 text-[12px] text-ink-faint">
              <div>
                Weighted: Market 30% · Team 25% · Traction 30% · Financials 15%.
              </div>
              <div>
                v1 rubric — narrative gap analysis & deeper read coming once
                LLM scoring is wired.
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ScoreGauge({ value }: { value: number }) {
  const size = 220;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // Animate from 0 → value
  const offsetTarget = circumference * (1 - value / 100);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2ded6"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2c5ba8"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offsetTarget }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[64px] font-extrabold leading-none tracking-[-0.04em] text-navy tabular-nums">
          <AnimatedNumber value={value} />
        </div>
        <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-ink-faint">
          / 100
        </div>
      </div>
    </div>
  );
}

function SubScoreBar({ sub, delay }: { sub: SubScore; delay: number }) {
  const low = sub.score < 50;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13px] font-bold text-ink">{sub.axis}</span>
        <span className="text-[14px] font-extrabold tabular-nums text-ink">
          <AnimatedNumber value={sub.score} />
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink/8">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${sub.score}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full ${low ? "bg-flag-red" : "bg-blue"}`}
        />
      </div>
    </div>
  );
}

/* ─── GAPS ───────────────────────────────────────────────────────────── */
export function GapsSection({ gaps }: { gaps: Gap[] }) {
  if (gaps.length === 0) return null;
  return (
    <section className="mt-20">
      <Reveal>
        <SectionTitle
          eyebrow="02 — Gap analysis"
          title="What investors are likely to flag."
        />
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {gaps.map((g, i) => (
          <Reveal key={`${g.axis}-${g.title}-${i}`} delay={i * 0.08}>
            <GapCard gap={g} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function GapCard({ gap }: { gap: Gap }) {
  const sevColor = {
    high: "text-flag-red bg-flag-red/8 border-flag-red/20",
    medium: "text-flag-amber bg-flag-amber/8 border-flag-amber/20",
    low: "text-ink-faint bg-ink/5 border-ink/10",
  }[gap.severity];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="rounded-xl border border-ink/10 bg-white p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] ${sevColor}`}
        >
          {gap.severity}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
          {gap.axis}
        </span>
      </div>
      <h3 className="text-[18px] font-extrabold tracking-tight text-navy">
        {gap.title}
      </h3>
      <p className="mt-3 text-[14px] leading-[1.6] text-ink-soft">
        <span className="font-bold text-ink">Why it matters · </span>
        {gap.why}
      </p>
      <div className="mt-4 rounded-md border border-ink/8 bg-paper p-3 text-[13px] leading-[1.55] text-ink">
        <span className="mr-1 font-bold text-blue">Closing:</span>
        {gap.closing}
      </div>
    </motion.div>
  );
}

/* ─── MATCHED INVESTORS ──────────────────────────────────────────────── */
export function MatchesSection({ matches }: { matches: InvestorMatch[] }) {
  return (
    <section className="mt-20">
      <Reveal>
        <SectionTitle
          eyebrow="03 — Matched investors"
          title="Investors whose thesis fits you right now."
        />
      </Reveal>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((m, i) => (
          <Reveal key={m.investor.id} delay={i * 0.06}>
            <InvestorCard match={m} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function InvestorCard({ match }: { match: InvestorMatch }) {
  const { investor, fitScore, reasons } = match;
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex h-full flex-col rounded-xl border border-ink/10 bg-white p-6"
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="text-[16px] font-extrabold tracking-tight text-navy">
            {investor.fundName}
          </div>
          <div className="text-[12px] text-ink-faint">
            {investor.partner} · {investor.partnerTitle}
          </div>
        </div>
        <FitBadge value={fitScore} />
      </div>

      <p className="mb-4 text-[13px] italic leading-[1.55] text-ink-soft">
        “{investor.thesisOneLiner}”
      </p>

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

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink/8 pt-4 text-[10px] uppercase tracking-[0.15em]">
        <span className="text-ink-faint">{investor.hq}</span>
        <span className="text-ink-faint">·</span>
        <span className="text-ink-faint">
          {investor.stages.join(" / ")}
        </span>
      </div>

      {investor.websiteUrl !== "#" && (
        <a
          href={investor.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-[12px] font-bold text-blue transition-colors hover:text-blue-light"
        >
          Visit site ↗
        </a>
      )}
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

/* ─── SHARED ─────────────────────────────────────────────────────────── */
export function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
        {eyebrow}
      </div>
      <h2 className="text-[clamp(28px,3.6vw,40px)] font-extrabold leading-[1.1] tracking-[-0.025em] text-navy">
        {title}
      </h2>
    </div>
  );
}
