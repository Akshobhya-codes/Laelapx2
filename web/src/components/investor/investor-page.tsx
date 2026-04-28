"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { InvestorThesis } from "@/lib/insforge/investors";
import { Reveal } from "@/components/motion/reveal";

const fmtUsd = (n: number): string =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
    : `$${Math.round(n / 1_000)}K`;

export function InvestorPage({
  thesis,
  fundSlug,
}: {
  thesis: InvestorThesis;
  fundSlug: string;
}) {
  return (
    <div className="bg-paper text-ink">
      <Hero thesis={thesis} fundSlug={fundSlug} />
      <Thesis thesis={thesis} />
      <CheckSize thesis={thesis} />
      {thesis.notablePortfolio && thesis.notablePortfolio.length > 0 && (
        <Portfolio companies={thesis.notablePortfolio} />
      )}
      <Footer thesis={thesis} fundSlug={fundSlug} />
    </div>
  );
}

/* ─── HERO ────────────────────────────────────────────────────────────── */
function Hero({
  thesis,
  fundSlug,
}: {
  thesis: InvestorThesis;
  fundSlug: string;
}) {
  return (
    <section
      className="relative flex min-h-[80vh] items-center bg-navy px-6 pt-32 pb-24 text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
        backgroundSize: "56px 56px",
      }}
    >
      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-30 border-b border-white/8 bg-navy/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="text-[14px] font-black tracking-tight text-white"
          >
            Laelapx<span className="text-blue-light">.</span>
            <span className="ml-2 text-[12px] font-semibold text-white/40">
              / {thesis.fundName}
            </span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-light">
            Investor profile
          </span>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 flex flex-wrap items-center gap-2"
        >
          <Pill tone="blue">Investor</Pill>
          {thesis.stages.slice(0, 4).map((s) => (
            <Pill key={s} tone="ghost">
              {s}
            </Pill>
          ))}
          {thesis.hq && <Pill tone="ghost">{thesis.hq}</Pill>}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-[clamp(56px,9vw,124px)] font-extrabold leading-[0.95] tracking-[-0.04em]"
        >
          {thesis.fundName}
          <span className="text-blue-light">.</span>
        </motion.h1>

        {(thesis.partnerName || thesis.partnerTitle) && (
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-7 text-[20px] font-medium text-white/65"
          >
            {[thesis.partnerName, thesis.partnerTitle]
              .filter(Boolean)
              .join(" · ")}
          </motion.p>
        )}

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-3xl text-[clamp(18px,2vw,26px)] italic leading-[1.4] text-white/85"
        >
          “{thesis.thesisOneLiner}”
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3"
        >
          {thesis.websiteUrl && (
            <a
              href={thesis.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-[14px] font-bold text-navy transition-transform hover:-translate-y-0.5"
            >
              Visit fund site
              <span className="text-base">↗</span>
            </a>
          )}
          <span className="text-[12px] uppercase tracking-[0.2em] text-white/35">
            laelapx.com/v/{fundSlug}
          </span>
        </motion.div>
      </div>
    </section>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "blue" | "ghost";
}) {
  return (
    <span
      className={
        tone === "blue"
          ? "rounded-full border border-blue-light/40 bg-blue-light/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-blue-light"
          : "rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/55"
      }
    >
      {children}
    </span>
  );
}

/* ─── SECTION FRAME ───────────────────────────────────────────────────── */
function SectionFrame({
  num,
  eyebrow,
  bg,
  ink,
  children,
}: {
  num: string;
  eyebrow: string;
  bg: "paper" | "paper-2" | "navy";
  ink: "ink" | "white";
  children: React.ReactNode;
}) {
  const bgCls =
    bg === "navy" ? "bg-navy" : bg === "paper-2" ? "bg-paper-2" : "bg-paper";
  const inkCls = ink === "white" ? "text-white" : "text-ink";
  const eyebrowCls = ink === "white" ? "text-blue-light" : "text-blue";
  return (
    <section className={`scroll-mt-20 px-6 py-24 sm:py-32 ${bgCls} ${inkCls}`}>
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

/* ─── THESIS ──────────────────────────────────────────────────────────── */
function Thesis({ thesis }: { thesis: InvestorThesis }) {
  return (
    <SectionFrame num="01" eyebrow="Thesis" bg="paper" ink="ink">
      <Reveal delay={0.05}>
        <h2 className="text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-navy">
          What we fund.
        </h2>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Reveal delay={0.1}>
          <Card>
            <CardEyebrow>Stages</CardEyebrow>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {thesis.stages.map((s) => (
                <Tag key={s}>{s}</Tag>
              ))}
            </div>
          </Card>
        </Reveal>
        <Reveal delay={0.18}>
          <Card>
            <CardEyebrow>Sectors</CardEyebrow>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {thesis.sectors.map((s) => (
                <Tag key={s} muted>
                  {s}
                </Tag>
              ))}
            </div>
          </Card>
        </Reveal>
      </div>
    </SectionFrame>
  );
}

/* ─── CHECK SIZE ──────────────────────────────────────────────────────── */
function CheckSize({ thesis }: { thesis: InvestorThesis }) {
  if (thesis.checkSizeMinUsd === undefined && thesis.checkSizeMaxUsd === undefined)
    return null;
  return (
    <SectionFrame num="02" eyebrow="Check size" bg="navy" ink="white">
      <Reveal delay={0.05}>
        <div className="mb-2 text-[14px] font-semibold text-white/50">
          Typical check
        </div>
        <div className="text-[clamp(60px,11vw,140px)] font-extrabold leading-none tracking-[-0.05em] text-white">
          {fmtUsd(thesis.checkSizeMinUsd ?? 0)}
          <span className="px-3 text-blue-light">–</span>
          {fmtUsd(thesis.checkSizeMaxUsd ?? 0)}
        </div>
      </Reveal>
      <Reveal delay={0.2}>
        <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-white/55">
          Founders raising in this band will see this fund as a strong-fit
          match in Discover.
        </p>
      </Reveal>
    </SectionFrame>
  );
}

/* ─── PORTFOLIO ───────────────────────────────────────────────────────── */
function Portfolio({ companies }: { companies: string[] }) {
  return (
    <SectionFrame num="03" eyebrow="Portfolio" bg="paper-2" ink="ink">
      <Reveal delay={0.05}>
        <h2 className="text-[clamp(34px,4.5vw,58px)] font-extrabold leading-[1.08] tracking-[-0.025em] text-navy">
          Notable bets.
        </h2>
      </Reveal>
      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((c, i) => (
          <Reveal key={c} delay={0.06 + i * 0.04}>
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="rounded-xl border border-ink/10 bg-paper p-5"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-blue to-navy text-[12px] font-black text-white">
                {c
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="mt-3 text-[16px] font-extrabold tracking-tight text-navy">
                {c}
              </div>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </SectionFrame>
  );
}

/* ─── FOOTER ──────────────────────────────────────────────────────────── */
function Footer({
  thesis,
  fundSlug,
}: {
  thesis: InvestorThesis;
  fundSlug: string;
}) {
  return (
    <footer className="border-t border-ink/8 bg-paper-2 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="text-[12px] text-ink-faint">
          {thesis.fundName} · v/{fundSlug}
          {thesis.hq ? ` · ${thesis.hq}` : ""}
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-7 transition-colors hover:bg-paper-2">
      {children}
    </div>
  );
}
function CardEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
      {children}
    </div>
  );
}
function Tag({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
        muted ? "bg-paper-2 text-ink-faint" : "bg-blue/10 text-blue"
      }`}
    >
      {children}
    </span>
  );
}
