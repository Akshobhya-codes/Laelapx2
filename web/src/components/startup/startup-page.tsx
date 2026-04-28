"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { Submission } from "@/lib/submission/schema";
import { Reveal } from "@/components/motion/reveal";
import {
  AnimatedNumber,
  formatUsd,
  formatUsdShort,
} from "@/components/motion/animated-number";
import { BlurredField, GateBanner } from "./blurred-field";

const NAV_LINKS = [
  { id: "problem", label: "Problem" },
  { id: "solution", label: "Solution" },
  { id: "market", label: "Market" },
  { id: "traction", label: "Traction" },
  { id: "team", label: "Team" },
  { id: "ask", label: "Ask" },
];

export type StartupLocks = {
  demoVideo: boolean;
  pitchDeck: boolean;
  founderLinkedIns: boolean[];
};

const DEFAULT_LOCKS: StartupLocks = {
  demoVideo: false,
  pitchDeck: false,
  founderLinkedIns: [],
};

export function StartupPage({
  data,
  locks = DEFAULT_LOCKS,
  canSeeContact = true,
  viewerSignedIn = false,
}: {
  data: Submission;
  locks?: StartupLocks;
  canSeeContact?: boolean;
  viewerSignedIn?: boolean;
}) {
  return (
    <div className="bg-paper text-ink">
      <StartupNav data={data} />
      {!canSeeContact && <GateBanner viewerSignedIn={viewerSignedIn} />}
      <Hero
        data={data}
        locks={locks}
        canSeeContact={canSeeContact}
        viewerSignedIn={viewerSignedIn}
      />
      <Problem data={data} />
      <Solution
        data={data}
        locks={locks}
        canSeeContact={canSeeContact}
        viewerSignedIn={viewerSignedIn}
      />
      <Market data={data} />
      <Traction data={data} />
      <Team
        data={data}
        locks={locks}
        canSeeContact={canSeeContact}
        viewerSignedIn={viewerSignedIn}
      />
      <Ask
        data={data}
        locks={locks}
        canSeeContact={canSeeContact}
        viewerSignedIn={viewerSignedIn}
      />
      <Footer data={data} />
    </div>
  );
}

/* ─── NAV ─────────────────────────────────────────────────────────────── */
function StartupNav({ data }: { data: Submission }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-30 border-b border-white/8 bg-navy/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link
          href="/"
          className="text-[14px] font-black tracking-tight text-white"
        >
          Laelapx<span className="text-blue-light">.</span>
          <span className="ml-2 text-[12px] font-semibold text-white/40">
            / {data.companyName}
          </span>
        </Link>
        <div className="hidden gap-5 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className="text-[12px] font-semibold uppercase tracking-[0.15em] text-white/45 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>
        {data.openToInvestorContact && (
          <div className="hidden items-center gap-2 rounded-full border border-flag-green/30 bg-flag-green/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-flag-green sm:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flag-green opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-flag-green" />
            </span>
            Open to outreach
          </div>
        )}
      </div>
    </nav>
  );
}

/* ─── HERO ────────────────────────────────────────────────────────────── */
function Hero({
  data,
  locks,
  canSeeContact,
  viewerSignedIn,
}: {
  data: Submission;
  locks: StartupLocks;
  canSeeContact: boolean;
  viewerSignedIn: boolean;
}) {
  return (
    <section
      className="relative flex min-h-screen items-center bg-navy px-6 pt-32 pb-24 text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
        backgroundSize: "56px 56px",
      }}
    >
      <div className="mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 flex flex-wrap items-center gap-2"
        >
          <Pill label={data.stage} tone="blue" />
          {data.sectors.slice(0, 3).map((s) => (
            <Pill key={s} label={s} tone="ghost" />
          ))}
          <Pill label={`${data.hqCity}, ${data.hqCountry}`} tone="ghost" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-[clamp(64px,11vw,148px)] font-extrabold leading-[0.95] tracking-[-0.04em]"
        >
          {data.companyName}
          <span className="text-blue-light">.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 max-w-3xl text-[clamp(20px,2.4vw,30px)] font-medium leading-[1.35] text-white/85"
        >
          {data.oneLiner}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3"
        >
          <a
            href={data.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-[14px] font-bold text-navy transition-transform hover:-translate-y-0.5"
          >
            Visit website
            <span className="text-base">↗</span>
          </a>
          {locks.demoVideo && (
            <span className="text-white/65">
              <BlurredField
                unlocked={canSeeContact}
                viewerSignedIn={viewerSignedIn}
                ariaLabel="Sign in to watch demo"
              >
                <a
                  href={data.demoVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] font-semibold text-white/65 transition-colors hover:text-white"
                >
                  Watch demo →
                </a>
              </BlurredField>
            </span>
          )}
          <span className="ml-2 text-[12px] uppercase tracking-[0.2em] text-white/35">
            Founded {data.foundedYear} · {data.founders.length} founder
            {data.founders.length > 1 ? "s" : ""} · team of {data.teamSize}
          </span>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 6, 0] }}
        transition={{
          opacity: { duration: 0.8, delay: 1 },
          y: { duration: 1.6, delay: 1.2, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase tracking-[0.25em] text-white/40"
      >
        Scroll ↓
      </motion.div>
    </section>
  );
}

function Pill({ label, tone }: { label: string; tone: "blue" | "ghost" }) {
  return (
    <span
      className={
        tone === "blue"
          ? "rounded-full border border-blue-light/40 bg-blue-light/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-blue-light"
          : "rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/55"
      }
    >
      {label}
    </span>
  );
}

/* ─── SECTION FRAME ───────────────────────────────────────────────────── */
function SectionFrame({
  num,
  eyebrow,
  id,
  bg,
  ink,
  children,
}: {
  num: string;
  eyebrow: string;
  id: string;
  bg: "paper" | "paper-2" | "navy";
  ink: "ink" | "white";
  children: React.ReactNode;
}) {
  const bgCls =
    bg === "navy" ? "bg-navy" : bg === "paper-2" ? "bg-paper-2" : "bg-paper";
  const inkCls = ink === "white" ? "text-white" : "text-ink";
  const eyebrowCls =
    ink === "white" ? "text-blue-light" : "text-blue";
  return (
    <section
      id={id}
      className={`scroll-mt-20 px-6 py-28 sm:py-36 ${bgCls} ${inkCls}`}
      style={
        ink === "white"
          ? {
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
              backgroundSize: "64px 64px",
            }
          : undefined
      }
    >
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div
            className={`mb-3 flex items-baseline gap-3 ${
              ink === "white" ? "text-white/35" : "text-ink-faint"
            }`}
          >
            <span className="text-[14px] font-bold tabular-nums tracking-wide">
              {num}
            </span>
            <span className="h-px w-10 bg-current opacity-40" />
            <span
              className={`text-[11px] font-bold uppercase tracking-[0.22em] ${eyebrowCls}`}
            >
              {eyebrow}
            </span>
          </div>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

/* ─── PROBLEM ─────────────────────────────────────────────────────────── */
function Problem({ data }: { data: Submission }) {
  return (
    <SectionFrame
      num="01"
      eyebrow="The problem"
      id="problem"
      bg="paper"
      ink="ink"
    >
      <Reveal delay={0.05}>
        <h2 className="text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-navy">
          What we&apos;re solving.
        </h2>
      </Reveal>
      <Reveal delay={0.15}>
        <p className="mt-8 max-w-3xl text-[clamp(17px,1.6vw,22px)] leading-[1.55] text-ink-soft">
          {data.problemDescription}
        </p>
      </Reveal>
    </SectionFrame>
  );
}

/* ─── SOLUTION ────────────────────────────────────────────────────────── */
function Solution({
  data,
  locks,
  canSeeContact,
  viewerSignedIn,
}: {
  data: Submission;
  locks: StartupLocks;
  canSeeContact: boolean;
  viewerSignedIn: boolean;
}) {
  return (
    <SectionFrame
      num="02"
      eyebrow="Our solution"
      id="solution"
      bg="paper-2"
      ink="ink"
    >
      <Reveal delay={0.05}>
        <h2 className="text-[clamp(34px,4.5vw,58px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-navy">
          Why now.
        </h2>
      </Reveal>
      <Reveal delay={0.15}>
        <p className="mt-6 max-w-3xl text-[17px] italic leading-[1.6] text-ink-soft">
          {data.whyNow}
        </p>
      </Reveal>

      <Reveal delay={0.25}>
        <div className="mt-12 rounded-xl border border-ink/10 bg-paper p-8 sm:p-10">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
            What we built
          </div>
          <p className="text-[clamp(17px,1.6vw,22px)] font-medium leading-[1.5] text-ink">
            {data.solutionDescription}
          </p>
          {locks.demoVideo && (
            <div className="mt-6 inline-block text-blue">
              <BlurredField
                unlocked={canSeeContact}
                viewerSignedIn={viewerSignedIn}
                ariaLabel="Sign in to watch demo"
              >
                <a
                  href={data.demoVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[14px] font-bold text-blue transition-colors hover:text-blue-light"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-blue text-white">
                    ▶
                  </span>
                  Watch the demo
                </a>
              </BlurredField>
            </div>
          )}
        </div>
      </Reveal>
    </SectionFrame>
  );
}

/* ─── MARKET ──────────────────────────────────────────────────────────── */
function Market({ data }: { data: Submission }) {
  return (
    <SectionFrame
      num="03"
      eyebrow="Market"
      id="market"
      bg="navy"
      ink="white"
    >
      <Reveal delay={0.05}>
        <div className="mb-2 text-[14px] font-semibold text-white/50">
          Total addressable market
        </div>
        <div className="text-[clamp(72px,14vw,180px)] font-extrabold leading-none tracking-[-0.05em] text-white">
          <AnimatedNumber value={data.tamUsd} format={formatUsdShort} />
        </div>
      </Reveal>
      <Reveal delay={0.2}>
        <p className="mt-3 max-w-2xl text-[14px] text-white/55 leading-relaxed">
          {data.tamReasoning}
        </p>
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Reveal delay={0.1}>
          <Card>
            <CardEyebrow>Customer</CardEyebrow>
            <CardBody>{data.icpDescription}</CardBody>
          </Card>
        </Reveal>
        <Reveal delay={0.2}>
          <Card>
            <CardEyebrow>Competition + edge</CardEyebrow>
            <CardBody>{data.competitorsAndEdge}</CardBody>
          </Card>
        </Reveal>
      </div>

      <Reveal delay={0.3}>
        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-7">
          <CardEyebrow>Defensibility</CardEyebrow>
          <CardBody>{data.defensibility}</CardBody>
        </div>
      </Reveal>
    </SectionFrame>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-7 transition-colors hover:bg-white/8">
      {children}
    </div>
  );
}
function CardEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-light">
      {children}
    </div>
  );
}
function CardBody({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] leading-[1.65] text-white/80">{children}</p>
  );
}

/* ─── TRACTION ────────────────────────────────────────────────────────── */
function Traction({ data }: { data: Submission }) {
  const showFin = data.showFinancialsPublic;
  return (
    <SectionFrame
      num="04"
      eyebrow="Traction"
      id="traction"
      bg="paper"
      ink="ink"
    >
      <Reveal delay={0.05}>
        <h2 className="text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-navy">
          What we&apos;ve shipped.
        </h2>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Reveal delay={0.05}>
          <Stat
            label="Customers"
            value={data.customerCount}
            format={(n) => Math.round(n).toLocaleString()}
          />
        </Reveal>
        {showFin && data.mrrUsd !== undefined && (
          <Reveal delay={0.15}>
            <Stat label="MRR" value={data.mrrUsd} format={formatUsd} />
          </Reveal>
        )}
        {data.momGrowthPct !== undefined && (
          <Reveal delay={0.25}>
            <Stat
              label="MoM growth"
              value={data.momGrowthPct}
              format={(n) => `${Math.round(n)}%`}
            />
          </Reveal>
        )}
      </div>

      <Reveal delay={0.15}>
        <div className="mt-14">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
            Milestones
          </div>
          <ul className="space-y-3">
            {data.milestones.map((m, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-start gap-4 rounded-lg border border-ink/10 bg-white p-4"
              >
                <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-blue/10 text-[12px] font-bold text-blue">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="pt-0.5 text-[15px] leading-[1.55] text-ink">{m}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.15em] text-ink-soft">
          <span
            className={`h-2 w-2 rounded-full ${
              data.launched ? "bg-flag-green" : "bg-flag-amber"
            }`}
          />
          {data.launched ? "Live" : "Pre-launch"} · {data.productStage}
        </div>
      </Reveal>
    </SectionFrame>
  );
}

function Stat({
  label,
  value,
  format,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
}) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-7">
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
        {label}
      </div>
      <div className="mt-3 text-[clamp(40px,5vw,64px)] font-extrabold leading-none tracking-[-0.03em] text-navy tabular-nums">
        <AnimatedNumber value={value} format={format} />
      </div>
    </div>
  );
}

/* ─── TEAM ────────────────────────────────────────────────────────────── */
function Team({
  data,
  locks,
  canSeeContact,
  viewerSignedIn,
}: {
  data: Submission;
  locks: StartupLocks;
  canSeeContact: boolean;
  viewerSignedIn: boolean;
}) {
  return (
    <SectionFrame
      num="05"
      eyebrow="Team"
      id="team"
      bg="paper-2"
      ink="ink"
    >
      <Reveal delay={0.05}>
        <h2 className="text-[clamp(34px,4.5vw,58px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-navy">
          Why this team.
        </h2>
      </Reveal>
      <Reveal delay={0.15}>
        <p className="mt-6 max-w-3xl text-[17px] leading-[1.6] text-ink-soft">
          {data.whyThisTeam}
        </p>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {data.founders.map((f, i) => (
          <Reveal key={`${f.name}-${i}`} delay={0.05 + i * 0.1}>
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="rounded-xl border border-ink/10 bg-paper p-7"
            >
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-blue text-[18px] font-extrabold text-white">
                {f.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="text-[20px] font-extrabold tracking-tight text-navy">
                {f.name}
              </div>
              <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-blue">
                {f.role}
              </div>
              {f.oneLineBio && (
                <p className="text-[14px] leading-[1.55] text-ink-soft">
                  {f.oneLineBio}
                </p>
              )}
              {locks.founderLinkedIns[i] && (
                <div className="mt-4 inline-block text-blue">
                  <BlurredField
                    unlocked={canSeeContact}
                    viewerSignedIn={viewerSignedIn}
                    ariaLabel={`Sign in to view ${f.name}'s LinkedIn`}
                  >
                    <a
                      href={f.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[12px] font-bold text-ink-faint transition-colors hover:text-blue"
                    >
                      LinkedIn ↗
                    </a>
                  </BlurredField>
                </div>
              )}
            </motion.div>
          </Reveal>
        ))}
      </div>

      {data.advisors && (
        <Reveal delay={0.2}>
          <div className="mt-8 rounded-lg border border-ink/10 bg-paper p-5">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
              Advisors / backers
            </div>
            <div className="text-[14px] text-ink-soft">{data.advisors}</div>
          </div>
        </Reveal>
      )}
    </SectionFrame>
  );
}

/* ─── ASK ─────────────────────────────────────────────────────────────── */
function Ask({
  data,
  locks,
  canSeeContact,
  viewerSignedIn,
}: {
  data: Submission;
  locks: StartupLocks;
  canSeeContact: boolean;
  viewerSignedIn: boolean;
}) {
  return (
    <SectionFrame num="06" eyebrow="The ask" id="ask" bg="navy" ink="white">
      <Reveal delay={0.05}>
        <div className="mb-2 text-[14px] font-semibold text-white/50">
          Currently raising · {data.roundType}
        </div>
        <div className="text-[clamp(72px,14vw,180px)] font-extrabold leading-none tracking-[-0.05em] text-white">
          <AnimatedNumber value={data.raisingUsd} format={formatUsdShort} />
        </div>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Reveal delay={0.1}>
          <Card>
            <CardEyebrow>Use of funds</CardEyebrow>
            <CardBody>{data.useOfFunds}</CardBody>
          </Card>
        </Reveal>
        <Reveal delay={0.2}>
          <Card>
            <CardEyebrow>Already raised</CardEyebrow>
            <CardBody>
              {data.raisedToDateUsd && data.raisedToDateUsd > 0
                ? `${formatUsdShort(data.raisedToDateUsd)}${
                    data.raisedFromWhom ? ` — ${data.raisedFromWhom}` : ""
                  }`
                : "Bootstrapped to date."}
            </CardBody>
          </Card>
        </Reveal>
      </div>

      {data.openToInvestorContact && (
        <Reveal delay={0.3}>
          <div className="mt-12 rounded-xl border border-blue-light/30 bg-blue-light/10 p-7">
            <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-blue-light">
              Open to outreach
            </div>
            <div className="mt-3 text-[24px] font-extrabold tracking-tight text-white">
              Reach out through Laelapx.
            </div>
            <p className="mt-2 max-w-xl text-[14px] text-white/60">
              Subscribed investors can request a connect. We pass the request
              to {data.companyName} with your thesis-fit context attached.
            </p>
            <button className="mt-5 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-[13px] font-bold text-navy transition-transform hover:-translate-y-0.5">
              Request connect
              <span className="text-base">→</span>
            </button>
          </div>
        </Reveal>
      )}

      {locks.pitchDeck && (
        <Reveal delay={0.4}>
          <div className="mt-8 inline-block text-white">
            <BlurredField
              unlocked={canSeeContact}
              viewerSignedIn={viewerSignedIn}
              ariaLabel="Sign in to view pitch deck"
            >
              <a
                href={data.pitchDeckUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/65 transition-colors hover:text-white"
              >
                View full pitch deck ↗
              </a>
            </BlurredField>
          </div>
        </Reveal>
      )}
    </SectionFrame>
  );
}

/* ─── FOOTER ──────────────────────────────────────────────────────────── */
function Footer({ data }: { data: Submission }) {
  return (
    <footer className="border-t border-ink/8 bg-paper-2 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="text-[12px] text-ink-faint">
          {data.companyName} · {data.hqCity}, {data.hqCountry} · Founded{" "}
          {data.foundedYear}
        </div>
        <Link
          href="/"
          className="text-[12px] font-bold text-ink-soft transition-colors hover:text-ink"
        >
          Verified by Laelapx<span className="text-blue">.</span>
        </Link>
      </div>
    </footer>
  );
}
