"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LogoSpinner } from "@/components/motion/logo-spinner";

/* ─── SCENE DEFINITIONS ─────────────────────────────────────────────────── */

type Scene = {
  id: string;
  index: string;
  title: string;
  caption: string;
  durationMs: number;
};

const SCENES: Scene[] = [
  {
    id: "upload",
    index: "01",
    title: "Drop in your deck.",
    caption:
      "Pitch deck PDF, a website URL, or fill the 6-step structured form. Founders pick what's fastest.",
    durationMs: 5_500,
  },
  {
    id: "analyze",
    index: "02",
    title: "We read it the way an analyst would.",
    caption:
      "Stage-specific rubric. Sector context. Live market signal. Runs in seconds — not weeks.",
    durationMs: 6_500,
  },
  {
    id: "score",
    index: "03",
    title: "A Fundability Score with an axis breakdown.",
    caption:
      "Composite out of 100, plus exactly where you're strong and where you're not.",
    durationMs: 5_500,
  },
  {
    id: "gaps",
    index: "04",
    title: "Specific gaps with how to close them.",
    caption:
      "No 'tell a better story.' Concrete next actions tied to the rubric tier above your score.",
    durationMs: 6_000,
  },
  {
    id: "matches",
    index: "05",
    title: "Matched against investors whose thesis fits.",
    caption:
      "On-platform funds get a live connect button. External funds get a direct apply link.",
    durationMs: 6_500,
  },
  {
    id: "cta",
    index: "06",
    title: "Ready when you are.",
    caption:
      "Founders get a Snapshot. Investors get a thesis-tuned pipeline. Both sides win.",
    durationMs: 7_000,
  },
];

const TOTAL_DURATION_MS = SCENES.reduce((a, s) => a + s.durationMs, 0);

/* ─── MAIN COMPONENT ────────────────────────────────────────────────────── */

export function SnapshotDemo() {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [elapsedInScene, setElapsedInScene] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  const scene = SCENES[sceneIdx];

  /* Advance time when playing. Uses rAF for smooth progress bar. */
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = null;
      return;
    }
    const tick = (now: number) => {
      if (lastTickRef.current == null) lastTickRef.current = now;
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      setElapsedInScene((prev) => {
        const next = prev + delta;
        if (next >= scene.durationMs) {
          // Advance scene
          setSceneIdx((i) => (i + 1) % SCENES.length);
          return 0;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = null;
    };
  }, [playing, scene.durationMs]);

  const goTo = useCallback((idx: number) => {
    setSceneIdx(((idx % SCENES.length) + SCENES.length) % SCENES.length);
    setElapsedInScene(0);
    lastTickRef.current = null;
  }, []);

  const restart = () => goTo(0);
  const togglePlay = () => setPlaying((p) => !p);
  const next = () => goTo(sceneIdx + 1);
  const prev = () => goTo(sceneIdx - 1);

  const sceneProgress = Math.min(1, elapsedInScene / scene.durationMs);

  return (
    <div className="relative min-h-screen overflow-hidden bg-navy text-white">
      {/* Backdrop grid */}
      <BackgroundGrid />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="text-[16px] font-black tracking-tight text-white"
        >
          Laelapx<span className="text-blue">.</span>
        </Link>
        <Link
          href="/"
          className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/60 transition-colors hover:text-white"
        >
          ← Back to site
        </Link>
      </header>

      {/* Main */}
      <main className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-8">
        {/* Eyebrow */}
        <div className="text-[11px] font-bold uppercase tracking-[0.28em] text-blue-light">
          Live product walk-through · {Math.round(TOTAL_DURATION_MS / 1000)}s
        </div>
        <h1 className="mt-3 max-w-3xl text-center text-[clamp(32px,5vw,56px)] font-extrabold leading-[1.05] tracking-[-0.025em]">
          What founders see when they hand Laelapx a deck.
        </h1>

        {/* Browser frame containing the scene */}
        <div className="relative mt-12 w-full">
          <BrowserFrame
            sceneIndex={sceneIdx + 1}
            totalScenes={SCENES.length}
            playing={playing}
            onTogglePlay={togglePlay}
            onPrev={prev}
            onNext={next}
            onRestart={restart}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={scene.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full w-full"
              >
                <SceneContent sceneId={scene.id} />
              </motion.div>
            </AnimatePresence>
          </BrowserFrame>
        </div>

        {/* Caption block */}
        <div className="mt-10 flex w-full max-w-3xl flex-col items-center text-center">
          <div className="text-[12px] font-bold uppercase tracking-[0.22em] text-blue-light">
            {scene.index} · {SCENES.length} scenes
          </div>
          <h2 className="mt-3 text-[clamp(22px,2.6vw,32px)] font-extrabold leading-tight tracking-[-0.02em] text-white">
            {scene.title}
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/65">
            {scene.caption}
          </p>
        </div>

        {/* Scene dots + progress */}
        <div className="mt-10 flex items-center gap-3">
          {SCENES.map((s, i) => {
            const isActive = i === sceneIdx;
            const isPast = i < sceneIdx;
            return (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                aria-label={`Scene ${i + 1}: ${s.title}`}
                className="group relative h-2 w-12 overflow-hidden rounded-full bg-white/10 transition-all hover:bg-white/20"
              >
                <span
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    isActive
                      ? "bg-blue-light"
                      : isPast
                      ? "bg-white/40"
                      : "bg-transparent"
                  }`}
                  style={{
                    width: isActive
                      ? `${sceneProgress * 100}%`
                      : isPast
                      ? "100%"
                      : "0%",
                    transition: isActive
                      ? "none"
                      : "width 0.3s ease",
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Final CTAs always visible below the demo */}
        <div className="mt-16 flex w-full max-w-2xl flex-col gap-4 text-center">
          <div className="text-[12px] font-bold uppercase tracking-[0.22em] text-white/40">
            When you're ready
          </div>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/handler/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-7 py-4 text-[14px] font-bold text-navy shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform hover:-translate-y-0.5"
            >
              Submit your startup
              <span className="text-base">→</span>
            </Link>
            <Link
              href="/handler/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/25 bg-white/5 px-7 py-4 text-[14px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              I'm an investor
              <span className="text-base">→</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── BACKGROUND ────────────────────────────────────────────────────────── */

function BackgroundGrid() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.07]">
        <svg
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <pattern
              id="grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="white"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      {/* Radial vignette */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.45)_100%)]" />
    </>
  );
}

/* ─── BROWSER FRAME ─────────────────────────────────────────────────────── */

function BrowserFrame({
  children,
  sceneIndex,
  totalScenes,
  playing,
  onTogglePlay,
  onPrev,
  onNext,
  onRestart,
}: {
  children: React.ReactNode;
  sceneIndex: number;
  totalScenes: number;
  playing: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-[0_30px_80px_rgba(0,0,0,0.5)] backdrop-blur-sm">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
          <div className="ml-4 hidden text-[11px] font-semibold text-white/40 sm:block">
            app.laelapx.com / snapshot
          </div>
        </div>
        <div className="flex items-center gap-3 text-white/50">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous scene"
            className="rounded p-1 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 5v14l-12-7z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="rounded p-1 transition-colors hover:bg-white/10 hover:text-white"
          >
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 4l14 8-14 8z" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next scene"
            className="rounded p-1 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 5v14l12-7z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onRestart}
            aria-label="Restart"
            className="ml-1 rounded p-1 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            </svg>
          </button>
          <span className="ml-2 hidden text-[11px] font-semibold tabular-nums text-white/40 sm:block">
            {sceneIndex} / {totalScenes}
          </span>
        </div>
      </div>

      {/* Stage */}
      <div className="relative aspect-[16/9] bg-paper">
        {children}
      </div>
    </div>
  );
}

/* ─── SCENES ────────────────────────────────────────────────────────────── */

function SceneContent({ sceneId }: { sceneId: string }) {
  switch (sceneId) {
    case "upload":
      return <UploadScene />;
    case "analyze":
      return <AnalyzeScene />;
    case "score":
      return <ScoreScene />;
    case "gaps":
      return <GapsScene />;
    case "matches":
      return <MatchesScene />;
    case "cta":
      return <CtaScene />;
    default:
      return null;
  }
}

function UploadScene() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-paper px-12">
      <div className="relative w-full max-w-xl">
        {/* Dropzone */}
        <div className="relative flex h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue/35 bg-white/60">
          <motion.div
            initial={{ y: -160, opacity: 0, rotate: -4 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ duration: 1.1, type: "spring", stiffness: 120, damping: 16 }}
            className="flex w-64 items-center gap-4 rounded-lg border border-ink/10 bg-white p-4 shadow-lg"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-blue/10 text-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-navy">
                yourstartup-deck.pdf
              </div>
              <div className="text-[11px] text-ink-faint">3.4 MB · 14 pages</div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.3 }}
            className="mt-5 text-[12px] font-semibold uppercase tracking-[0.18em] text-blue"
          >
            Deck received
          </motion.div>
        </div>
        {/* Alt input options below */}
        <div className="mt-5 flex items-center justify-center gap-2 text-[12px] text-ink-faint">
          <span className="rounded border border-ink/10 bg-paper-2 px-2 py-1 font-mono text-[10px]">
            PDF
          </span>
          <span className="rounded border border-ink/10 bg-paper-2 px-2 py-1 font-mono text-[10px]">
            URL
          </span>
          <span className="rounded border border-ink/10 bg-paper-2 px-2 py-1 font-mono text-[10px]">
            6-STEP FORM
          </span>
        </div>
      </div>
    </div>
  );
}

function AnalyzeScene() {
  const STATUSES = useMemo(
    () => [
      "Parsing slides…",
      "Reading the market…",
      "Scoring the team…",
      "Surfacing gaps…",
      "Matching investors…",
    ],
    []
  );
  const [statusIdx, setStatusIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setStatusIdx((i) => (i + 1) % STATUSES.length);
    }, 1100);
    return () => clearInterval(id);
  }, [STATUSES.length]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-paper">
      <div className="flex flex-col items-center gap-6">
        <LogoSpinner size={88} />
        <div className="flex flex-col items-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
            Analyzing
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={statusIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="mt-2 text-[18px] font-extrabold tracking-tight text-navy"
            >
              {STATUSES[statusIdx]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ScoreScene() {
  const COMPOSITE = 78;
  const SUBS = [
    { label: "Market", value: 82 },
    { label: "Team", value: 71 },
    { label: "Traction", value: 64 },
    { label: "Financials", value: 80 },
  ];
  return (
    <div className="flex h-full w-full items-center justify-center bg-paper px-12">
      <div className="grid w-full max-w-3xl grid-cols-1 items-center gap-12 md:grid-cols-[auto_1fr]">
        {/* Gauge */}
        <div className="flex justify-center">
          <Gauge value={COMPOSITE} />
        </div>
        {/* Sub-scores */}
        <div className="flex flex-col gap-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
            Sub-scores
          </div>
          {SUBS.map((s, i) => (
            <SubScoreBar
              key={s.label}
              label={s.label}
              value={s.value}
              delay={0.4 + i * 0.18}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const SIZE = 200;
  const STROKE = 14;
  const R = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="rgb(28 43 66 / 0.08)"
          strokeWidth={STROKE}
        />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="rgb(58 124 240)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - value / 100) }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="text-[64px] font-extrabold leading-none tabular-nums text-navy"
        >
          <CountUp to={value} duration={1.6} />
        </motion.div>
        <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-ink-faint">
          Fundability
        </div>
      </div>
    </div>
  );
}

function CountUp({ to, duration }: { to: number; duration: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(eased * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{n}</>;
}

function SubScoreBar({
  label,
  value,
  delay,
}: {
  label: string;
  value: number;
  delay: number;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-24 text-[13px] font-bold text-navy">{label}</div>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-ink/8">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.0, delay, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 rounded-full bg-blue"
        />
      </div>
      <div className="w-10 text-right text-[13px] font-extrabold tabular-nums text-navy">
        {value}
      </div>
    </div>
  );
}

function GapsScene() {
  const GAPS = [
    {
      severity: "high" as const,
      title: "TAM is top-down — show the math",
      closing:
        "Rebuild bottom-up: # of target companies × ACV. Cite the source.",
    },
    {
      severity: "medium" as const,
      title: "Founder-market fit is buried",
      closing:
        "Each bio: one credential + one shipped result tied to this exact problem.",
    },
    {
      severity: "medium" as const,
      title: "Use of funds isn't milestone-linked",
      closing:
        "Allocate 100% across 3 buckets. Name the Series A trigger each unlocks.",
    },
  ];
  return (
    <div className="flex h-full w-full items-center justify-center bg-paper px-12">
      <div className="w-full max-w-2xl">
        <div className="mb-5 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
          Top gaps
        </div>
        <div className="flex flex-col gap-4">
          {GAPS.map((g, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.35 }}
              className="flex items-start gap-4 rounded-xl border border-ink/10 bg-white p-5"
            >
              <span
                className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                  g.severity === "high" ? "bg-[#e8554e]" : "bg-[#f0a93a]"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-extrabold text-navy">
                  {g.title}
                </div>
                <div className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                  {g.closing}
                </div>
              </div>
              <span
                className={`flex-shrink-0 rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${
                  g.severity === "high"
                    ? "border-[#e8554e]/30 bg-[#e8554e]/10 text-[#e8554e]"
                    : "border-[#f0a93a]/30 bg-[#f0a93a]/10 text-[#c47a1f]"
                }`}
              >
                {g.severity}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchesScene() {
  const MATCHES = [
    {
      fund: "Atlas Ventures",
      partner: "Maya Chen · Partner",
      fit: 89,
      reasons: ["Stage match — invests at Seed.", "Sector overlap on AI/ML, DevTools."],
    },
    {
      fund: "Northwind Capital",
      partner: "Devon Ortiz · Principal",
      fit: 76,
      reasons: ["Check size fits — they write $500K–$2M.", "Thesis includes B2B SaaS."],
    },
    {
      fund: "Hinge Seed",
      partner: "Priya Rao · GP",
      fit: 71,
      reasons: ["Stage match — invests at Seed.", "Sector overlap on AI/ML."],
    },
  ];
  return (
    <div className="flex h-full w-full items-center justify-center bg-paper px-12">
      <div className="w-full max-w-3xl">
        <div className="mb-5 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
          Investor matches
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {MATCHES.map((m, i) => (
            <motion.div
              key={m.fund}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.25 + i * 0.22 }}
              className="flex flex-col rounded-xl border border-ink/10 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-extrabold text-navy">
                    {m.fund}
                  </div>
                  <div className="truncate text-[10px] text-ink-faint">
                    {m.partner}
                  </div>
                </div>
                <div className="flex flex-col items-end rounded-md border border-blue/30 bg-blue/8 px-2 py-1">
                  <span className="text-[13px] font-extrabold leading-none tabular-nums text-blue">
                    {m.fit}
                    <span className="text-[9px] font-bold opacity-70">%</span>
                  </span>
                  <span className="text-[7px] font-bold uppercase tracking-[0.15em] text-blue/70">
                    Fit
                  </span>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {m.reasons.map((r, ri) => (
                  <li
                    key={ri}
                    className="flex items-start gap-2 text-[11px] leading-snug text-ink-soft"
                  >
                    <span className="mt-[5px] h-1 w-1 flex-shrink-0 rounded-full bg-blue" />
                    {r}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CtaScene() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy via-navy to-[#0b1a36] px-12 text-white">
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
          className="flex h-20 w-20 items-center justify-center"
        >
          <img
            src="/laelapx-logo.png"
            alt="Laelapx"
            width={80}
            height={80}
            className="select-none"
            draggable={false}
          />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-6 text-[clamp(28px,3.6vw,44px)] font-extrabold leading-tight tracking-[-0.025em]"
        >
          Built for founders raising
          <br />
          and investors picking.
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-4 max-w-md text-[14px] leading-relaxed text-white/60"
        >
          Submit once. Get scored. Show up in front of the right funds — and
          apply directly to the ones we don&apos;t host.
        </motion.p>
      </div>
    </div>
  );
}
