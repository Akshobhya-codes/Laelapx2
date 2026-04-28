"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal } from "@/components/motion/reveal";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { NotificationsBell } from "@/components/notifications/bell";
import { SearchBar } from "@/components/search/search-bar";

type Project = {
  slug: string;
  name: string;
  oneLiner: string;
  stage: string;
  sectors: string[];
  score: number;
  productStage: string;
  launched: boolean;
  lastUpdatedRel: string;
};

export function FounderHome({
  displayName,
  email,
  profileImageUrl,
  projects,
}: {
  displayName: string | null;
  email: string | null;
  profileImageUrl: string | null;
  projects: Project[];
}) {
  const firstName = displayName?.split(" ")[0] || "there";
  const isEmpty = projects.length === 0;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <FounderNav
        firstName={firstName}
        email={email}
        profileImageUrl={profileImageUrl}
      />

      <header className="border-b border-ink/8 bg-paper-2 px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue mb-3">
              Founder workspace
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="text-[clamp(40px,5.5vw,72px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-navy">
              Welcome back, <span className="text-blue">{firstName}</span>.
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-soft">
              {isEmpty
                ? "Submit your first startup. We'll score it, surface the gaps an investor would flag, and match it to investors whose thesis fits."
                : `${projects.length} ${
                    projects.length === 1 ? "project" : "projects"
                  } in your portfolio. Pick one to keep working.`}
            </p>
          </Reveal>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-14">
        {/* Toolbar */}
        <Reveal>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
              {isEmpty ? "Your projects" : `${projects.length} active`}
            </div>
            <Link
              href="/founder/new"
              className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-blue"
            >
              <span className="text-base leading-none">+</span>
              New submission
            </Link>
          </div>
        </Reveal>

        {/* Project grid OR empty state */}
        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {projects.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.06}>
                <ProjectCard project={p} />
              </Reveal>
            ))}
            <Reveal delay={projects.length * 0.06}>
              <NewProjectCard />
            </Reveal>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── NAV ─────────────────────────────────────────────────────────────── */
function FounderNav({
  firstName,
  email,
  profileImageUrl,
}: {
  firstName: string;
  email: string | null;
  profileImageUrl: string | null;
}) {
  return (
    <nav className="sticky top-0 z-20 border-b border-ink/8 bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex flex-shrink-0 items-center gap-3">
          <Link href="/" className="text-[16px] font-black tracking-tight text-navy">
            Laelapx<span className="text-blue">.</span>
          </Link>
          <Link
            href="/founder"
            className="hidden rounded-full border border-ink/10 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft sm:inline-block"
          >
            Founder
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <SearchBar />
        </div>

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
          <Link
            href="/handler/sign-out"
            className="hidden text-[12px] font-semibold text-ink-faint transition-colors hover:text-flag-red sm:inline"
          >
            Sign out
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─── PROJECT CARD ────────────────────────────────────────────────────── */
function ProjectCard({ project }: { project: Project }) {
  const initials = project.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <Link
        href={`/founder/${project.slug}`}
        className="group flex h-full flex-col rounded-2xl border border-ink/10 bg-white p-7 transition-all hover:border-blue/40 hover:shadow-[0_8px_32px_rgba(28,43,66,0.08)]"
      >
        {/* Top row */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-blue to-navy text-[15px] font-black text-white">
              {initials}
            </div>
            <div>
              <div className="text-[20px] font-extrabold leading-tight tracking-tight text-navy">
                {project.name}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    project.launched ? "bg-flag-green" : "bg-flag-amber"
                  }`}
                />
                {project.launched ? "Live" : "Pre-launch"} · {project.productStage}
              </div>
            </div>
          </div>
          <ScoreChip value={project.score} />
        </div>

        <p className="mb-5 text-[14px] leading-[1.55] text-ink-soft line-clamp-3">
          {project.oneLiner}
        </p>

        <div className="mb-5 flex flex-wrap gap-1.5">
          <Tag>{project.stage}</Tag>
          {project.sectors.map((s) => (
            <Tag key={s} muted>
              {s}
            </Tag>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-ink/8 pt-4">
          <span className="text-[11px] uppercase tracking-[0.15em] text-ink-faint">
            Updated {project.lastUpdatedRel}
          </span>
          <span className="text-[12px] font-bold text-blue transition-colors group-hover:text-blue-light">
            Open →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function ScoreChip({ value }: { value: number }) {
  const tone =
    value >= 85
      ? "border-flag-green/30 bg-flag-green/10 text-flag-green"
      : value >= 65
      ? "border-blue/30 bg-blue/10 text-blue"
      : "border-flag-amber/30 bg-flag-amber/10 text-flag-amber";
  return (
    <div
      className={`flex flex-col items-end rounded-md border px-2.5 py-1 ${tone}`}
    >
      <span className="text-[18px] font-extrabold leading-none tabular-nums">
        <AnimatedNumber value={value} />
      </span>
      <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-70">
        Score
      </span>
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
      className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
        muted
          ? "bg-paper-2 text-ink-faint"
          : "bg-blue/10 text-blue"
      }`}
    >
      {children}
    </span>
  );
}

/* ─── NEW PROJECT CARD ────────────────────────────────────────────────── */
function NewProjectCard() {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <Link
        href="/founder/new"
        className="group flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/15 bg-paper p-8 text-center transition-all hover:border-blue/45 hover:bg-white"
      >
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-ink/10 bg-white text-[24px] font-light text-ink-faint transition-colors group-hover:border-blue group-hover:text-blue">
          +
        </div>
        <div className="mt-5 text-[16px] font-extrabold tracking-tight text-navy">
          New submission
        </div>
        <p className="mt-1 max-w-[240px] text-[13px] text-ink-soft">
          Add another company. Each gets its own Snapshot + matched investors.
        </p>
      </Link>
    </motion.div>
  );
}

/* ─── EMPTY STATE ─────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <Reveal>
      <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-paper-2 p-14 text-center sm:p-20">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-ink/10 bg-white text-[28px] text-blue"
        >
          ▲
        </motion.div>
        <h2 className="mt-6 text-[28px] font-extrabold tracking-tight text-navy">
          Submit your first startup.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
          A 6-step submission generates your Fundability Score, gap analysis,
          public startup page, and matched investor list — all in one shot.
        </p>
        <Link
          href="/founder/new"
          className="mt-7 inline-flex items-center gap-2 rounded-md bg-blue px-6 py-3 text-[14px] font-bold text-white transition-colors hover:bg-blue-light"
        >
          Start a submission
          <span className="text-base">→</span>
        </Link>
      </div>
    </Reveal>
  );
}
