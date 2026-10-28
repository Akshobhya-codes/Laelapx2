"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Reveal } from "@/components/motion/reveal";
import {
  AnimatedNumber,
  formatUsdShort,
} from "@/components/motion/animated-number";
import { NotificationsBell } from "@/components/notifications/bell";
import { SearchBar } from "@/components/search/search-bar";
import { toggleSaveAction } from "@/app/actions/investor";
import { startPilotAction } from "@/app/actions/billing";
import { PlanBadge } from "@/components/billing/locked-section";
import type { InvestorQuota } from "@/lib/billing/entitlements";

/** What the signed-in investor is allowed to see. Built in page.tsx. */
export type DiscoverAccess = {
  active: boolean;
  planId: string | null;
  planName: string | null;
  pilotExhausted: boolean;
  expired: boolean;
  isTeamMember: boolean;
  teamName: string | null;
  quota: InvestorQuota;
  justStartedPilot: boolean;
};

type Card = {
  slug: string;
  name: string;
  oneLiner: string;
  stage: string;
  sectors: string[];
  hq: string;
  score: number;
  fit: number;
  fitReasons: string[];
  raisingUsd: number;
  roundType: string;
  productStage: string;
  launched: boolean;
  isSaved: boolean;
  connectStatus: "pending" | "accepted" | "declined" | null;
  conversationId: string | null;
  /** Already opened by this account — opening again costs nothing. */
  unlocked: boolean;
};

const STAGES = ["Pre-Seed", "Seed", "Series A", "Series B+"] as const;

export function Discover({
  displayName,
  profileImageUrl,
  thesis,
  cards,
  access,
}: {
  displayName: string | null;
  profileImageUrl: string | null;
  thesis: { fundName: string } | null;
  cards: Card[];
  access: DiscoverAccess;
}) {
  const firstName = displayName?.split(" ")[0] || "you";
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const allSectors = Array.from(
    new Set(cards.flatMap((c) => c.sectors))
  ).sort();

  const filtered = cards.filter((c) => {
    if (stageFilter && c.stage !== stageFilter) return false;
    if (sectorFilter && !c.sectors.includes(sectorFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !c.name.toLowerCase().includes(q) &&
        !c.oneLiner.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Top nav */}
      <FunderNav
        firstName={firstName}
        profileImageUrl={profileImageUrl}
        breadcrumb="Discover"
        planBadge={planBadgeFor(access)}
      />

      <header className="border-b border-ink/8 bg-paper-2 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue mb-3">
              Deal flow
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="text-[clamp(40px,5vw,64px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-navy">
              {filtered.length === cards.length ? (
                <>
                  <span className="text-blue">{cards.length}</span> startup
                  {cards.length === 1 ? "" : "s"} live
                </>
              ) : (
                <>
                  <span className="text-blue">{filtered.length}</span> of{" "}
                  {cards.length} match
                </>
              )}
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-soft">
              {thesis ? (
                <>
                  Sorted by fit against{" "}
                  <span className="font-bold text-ink">{thesis.fundName}</span>
                  &apos;s thesis. Click any card for the full pitch.
                </>
              ) : (
                <>
                  No thesis set yet — sorted by Fundability Score.{" "}
                  <Link
                    href="/funder/thesis"
                    className="font-bold text-blue underline-offset-2 hover:underline"
                  >
                    Set your thesis
                  </Link>{" "}
                  to see fit scores instead.
                </>
              )}
            </p>
          </Reveal>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {!access.active ? (
          <NoAccess access={access} />
        ) : (
        <>
        <QuotaStrip access={access} />

        {/* Filter bar */}
        <Reveal>
          <div className="mb-8 space-y-4">
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by company or tagline…"
                className="w-full rounded-lg border border-ink/10 bg-white px-5 py-3.5 pl-11 text-[15px] outline-none transition-all placeholder:text-ink-faint focus:border-blue focus:ring-4 focus:ring-blue/15"
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-ink-faint">
                ⌕
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterPill
                active={stageFilter === null}
                onClick={() => setStageFilter(null)}
              >
                All stages
              </FilterPill>
              {STAGES.map((s) => (
                <FilterPill
                  key={s}
                  active={stageFilter === s}
                  onClick={() => setStageFilter(s === stageFilter ? null : s)}
                >
                  {s}
                </FilterPill>
              ))}
            </div>

            {allSectors.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <FilterPill
                  small
                  active={sectorFilter === null}
                  onClick={() => setSectorFilter(null)}
                >
                  All sectors
                </FilterPill>
                {allSectors.slice(0, 12).map((s) => (
                  <FilterPill
                    small
                    key={s}
                    active={sectorFilter === s}
                    onClick={() =>
                      setSectorFilter(s === sectorFilter ? null : s)
                    }
                  >
                    {s}
                  </FilterPill>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* Results */}
        {filtered.length === 0 ? (
          <Reveal>
            <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-white p-14 text-center">
              <div className="text-[15px] font-semibold text-ink">
                No startups match your filters.
              </div>
              <p className="mt-2 text-[13px] text-ink-soft">
                Try clearing a filter or widening your search.
              </p>
            </div>
          </Reveal>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((c, i) => (
                <motion.div
                  key={c.slug}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{
                    duration: 0.35,
                    delay: Math.min(i * 0.04, 0.4),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <DiscoverCard
                    card={c}
                    hasThesis={!!thesis}
                    canUnlock={access.quota.canUnlock}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        </>
        )}
      </main>
    </div>
  );
}

/* ─── ACCESS: plan badge, quota strip, no-plan state ──────────────────── */

function planBadgeFor(access: DiscoverAccess) {
  if (!access.active || !access.planName) {
    return { name: access.expired ? "Plan ended" : "No plan", tone: "warn" as const };
  }
  return {
    name: access.isTeamMember ? `${access.planName} · team` : access.planName,
    tone: access.planId === "pilot" ? ("neutral" as const) : ("paid" as const),
  };
}

function QuotaStrip({ access }: { access: DiscoverAccess }) {
  const q = access.quota;
  const resets = new Date(q.weekResetsAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const exhausted = !q.canUnlock;
  return (
    <Reveal>
      <div
        className={clsx(
          "mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-3 text-[13px]",
          exhausted ? "border-flag-amber/30 bg-flag-amber/10" : "border-ink/10 bg-white"
        )}
      >
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {access.justStartedPilot && (
            <span className="rounded-full bg-flag-green/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-flag-green">
              Pilot started
            </span>
          )}
          <span className="font-bold text-ink">
            {q.total !== null
              ? `${q.remainingTotal} of ${q.total} pilot profiles left`
              : q.weekly === null
              ? "Unlimited profiles"
              : `${q.remainingThisWeek} of ${q.weekly} profiles left this week`}
          </span>
          <span className="text-ink-faint">
            {q.total !== null
              ? "Opening a founder's full profile uses one."
              : q.weekly === null
              ? "Open as many as you like."
              : `Opening a founder's full profile uses one · resets ${resets}.`}
          </span>
        </div>
        {exhausted ? (
          <Link href="/pricing?side=investor" className="font-bold text-blue hover:text-blue-light">
            Need more this week? →
          </Link>
        ) : (
          <Link href="/billing?side=investor" className="font-semibold text-ink-faint hover:text-ink">
            {access.planName}{access.isTeamMember ? ` · ${access.teamName}` : ""} · manage
          </Link>
        )}
      </div>
    </Reveal>
  );
}

function NoAccess({ access }: { access: DiscoverAccess }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const canPilot = !access.pilotExhausted && !access.expired;
  return (
    <Reveal>
      <div className="overflow-hidden rounded-2xl border border-blue/30 bg-gradient-to-br from-blue/[0.06] via-paper to-paper p-10 sm:p-14">
        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
          {access.expired ? "Plan ended" : "Investor access"}
        </div>
        <h2 className="mt-3 max-w-xl text-[clamp(28px,3.5vw,42px)] font-extrabold leading-[1.1] tracking-[-0.025em] text-navy">
          {access.expired
            ? "Your investor plan has ended."
            : "Founders who match your criteria, every week."}
        </h2>
        <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink-soft">
          {access.expired
            ? "Pick a plan to keep the deal flow coming. Everything you saved and every note you wrote is still here."
            : canPilot
            ? "Try it free for 60 days: we'll surface 15 founder profiles against your stated criteria and track whether they were useful. No card needed."
            : "Pick a plan to see founder profiles matched to your thesis."}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          {canPilot && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setErr(null);
                start(async () => {
                  try {
                    await startPilotAction();
                  } catch (e) {
                    if (e && typeof e === "object" && "digest" in e) throw e;
                    setErr(e instanceof Error ? e.message : "Couldn't start the pilot");
                  }
                });
              }}
              className="inline-flex items-center gap-2 rounded-md bg-blue px-6 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-blue-light disabled:opacity-60"
            >
              {pending ? "Starting…" : "Start the free pilot"}
              <span className="text-base">→</span>
            </button>
          )}
          <Link
            href="/pricing?side=investor"
            className="inline-flex items-center gap-2 rounded-md border border-navy px-6 py-3.5 text-[14px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            See investor plans
          </Link>
        </div>
        {err && <p className="mt-3 text-[13px] text-flag-red">{err}</p>}
        <p className="mt-6 text-[11px] italic text-ink-faint">
          Investor access is limited to founder-approved profiles and materials. Laelapx does not provide
          investment advice; you are responsible for your own diligence.
        </p>
      </div>
    </Reveal>
  );
}

/* ─── DISCOVER CARD ───────────────────────────────────────────────────── */
function DiscoverCard({
  card,
  hasThesis,
  canUnlock,
}: {
  card: Card;
  hasThesis: boolean;
  canUnlock: boolean;
}) {
  const initials = card.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Unlocked profiles always open. Locked ones open (and spend a unit) while
  // quota remains; once it's gone the card points at billing instead.
  const blocked = !card.unlocked && !canUnlock;

  return (
    <Link
      href={blocked ? "/billing?side=investor" : `/s/${card.slug}`}
      className={clsx(
        "group relative flex h-full flex-col rounded-2xl border bg-white p-6 transition-all hover:-translate-y-0.5",
        blocked
          ? "border-dashed border-ink/15 hover:border-flag-amber/50"
          : "border-ink/10 hover:border-blue/40 hover:shadow-[0_8px_32px_rgba(28,43,66,0.08)]"
      )}
    >
      <SaveStar slug={card.slug} initialSaved={card.isSaved} />

      {/* Top row */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-blue to-navy text-[15px] font-black text-white">
            {initials}
          </div>
          <div>
            <div className="text-[18px] font-extrabold leading-tight tracking-tight text-navy">
              {card.name}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  card.launched ? "bg-flag-green" : "bg-flag-amber"
                }`}
              />
              {card.launched ? "Live" : "Pre-launch"} · {card.productStage}
            </div>
          </div>
        </div>
        {hasThesis ? <FitChip value={card.fit} /> : <ScoreChip value={card.score} />}
      </div>

      <p className="mb-5 text-[14px] leading-[1.55] text-ink-soft line-clamp-2">
        {card.oneLiner}
      </p>

      {/* Tags */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        <Tag>{card.stage}</Tag>
        {card.sectors.slice(0, 3).map((s) => (
          <Tag key={s} muted>
            {s}
          </Tag>
        ))}
      </div>

      {/* Fit reasons (if thesis) */}
      {hasThesis && card.fitReasons.length > 0 && (
        <ul className="mb-5 space-y-1.5">
          {card.fitReasons.map((r, i) => (
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

      {/* Engagement badge row */}
      {(card.connectStatus || card.isSaved) && (
        <div className="mb-3">
          <EngagementBadge
            connectStatus={card.connectStatus}
            isSaved={card.isSaved}
            conversationId={card.conversationId}
          />
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-ink/8 pt-4">
        <div className="text-[12px] text-ink-faint">
          <span className="font-bold text-ink">
            {formatUsdShort(card.raisingUsd)}
          </span>{" "}
          · {card.roundType} · {card.hq}
        </div>
        <span
          className={clsx(
            "text-[12px] font-bold transition-colors",
            blocked ? "text-flag-amber" : "text-blue group-hover:text-blue-light"
          )}
        >
          {blocked ? "🔒 Limit reached" : card.unlocked ? "Open →" : "Unlock →"}
        </span>
      </div>
    </Link>
  );
}

function EngagementBadge({
  connectStatus,
  isSaved,
  conversationId,
}: {
  connectStatus: "pending" | "accepted" | "declined" | null;
  isSaved: boolean;
  conversationId: string | null;
}) {
  // Status priority: accepted > pending > declined > saved
  if (connectStatus === "accepted" && conversationId) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = `/messages/${conversationId}`;
        }}
        className="inline-flex items-center gap-2 rounded-full border border-flag-green/30 bg-flag-green/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-flag-green transition-colors hover:bg-flag-green/15"
      >
        <span>✓</span>
        Connected — message
      </button>
    );
  }
  if (connectStatus === "pending") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-blue/30 bg-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-blue">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue" />
        </span>
        Connect requested
      </span>
    );
  }
  if (connectStatus === "declined") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-paper-2 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">
        Passed
      </span>
    );
  }
  if (isSaved) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-flag-amber/30 bg-flag-amber/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-flag-amber">
        <span>★</span>
        Saved
      </span>
    );
  }
  return null;
}

/* ─── SAVE STAR (top-right of card; doesn't trigger card link) ───────── */
function SaveStar({
  slug,
  initialSaved,
}: {
  slug: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        const { saved: next } = await toggleSaveAction(slug);
        setSaved(next);
      } catch {
        /* surface via toast in v2 */
      }
    });
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isPending}
      whileTap={{ scale: 0.85 }}
      className={clsx(
        "absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full border text-[14px] font-bold transition-colors",
        saved
          ? "border-blue-light/60 bg-blue-light/15 text-blue"
          : "border-ink/10 bg-white text-ink-faint hover:border-ink/25 hover:text-ink"
      )}
      aria-label={saved ? "Unsave" : "Save"}
    >
      {saved ? "★" : "☆"}
    </motion.button>
  );
}

function FitChip({ value }: { value: number }) {
  const tone =
    value >= 85
      ? "border-flag-green/30 bg-flag-green/10 text-flag-green"
      : value >= 65
      ? "border-blue/30 bg-blue/10 text-blue"
      : value >= 40
      ? "border-flag-amber/30 bg-flag-amber/10 text-flag-amber"
      : "border-ink/10 bg-paper text-ink-faint";
  return (
    <div
      className={clsx(
        "flex flex-col items-end rounded-md border px-2.5 py-1",
        tone
      )}
    >
      <span className="text-[18px] font-extrabold leading-none tabular-nums">
        <AnimatedNumber value={value} />
        <span className="text-[10px] font-bold opacity-70">%</span>
      </span>
      <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-70">
        Fit
      </span>
    </div>
  );
}

function ScoreChip({ value }: { value: number }) {
  return (
    <div className="flex flex-col items-end rounded-md border border-blue/30 bg-blue/8 px-2.5 py-1 text-blue">
      <span className="text-[18px] font-extrabold leading-none tabular-nums">
        <AnimatedNumber value={value} />
      </span>
      <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-70">
        Score
      </span>
    </div>
  );
}

function FilterPill({
  children,
  active,
  onClick,
  small = false,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={clsx(
        "rounded-full border font-semibold transition-colors",
        small
          ? "px-3 py-1 text-[11px]"
          : "px-3.5 py-1.5 text-[12px]",
        active
          ? "border-navy bg-navy text-white"
          : "border-ink/10 bg-white text-ink-soft hover:border-ink/25 hover:text-ink"
      )}
    >
      {children}
    </motion.button>
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
      className={clsx(
        "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
        muted ? "bg-paper-2 text-ink-faint" : "bg-blue/10 text-blue"
      )}
    >
      {children}
    </span>
  );
}

/* ─── SHARED NAV ──────────────────────────────────────────────────────── */
export function FunderNav({
  firstName,
  profileImageUrl,
  breadcrumb,
  planBadge,
}: {
  firstName: string;
  profileImageUrl: string | null;
  breadcrumb?: string;
  planBadge?: { name: string; tone: "neutral" | "paid" | "warn" };
}) {
  return (
    <nav className="sticky top-0 z-20 border-b border-ink/8 bg-paper/85 backdrop-blur-sm">
      {/* Top row: brand + search + account */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex flex-shrink-0 items-center gap-2">
          <Link
            href="/"
            className="text-[16px] font-black tracking-tight text-navy"
          >
            Laelapx<span className="text-blue">.</span>
          </Link>
          <span className="text-ink-faint">/</span>
          <Link
            href="/funder"
            className="text-[12px] font-bold uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-ink"
          >
            Investor
          </Link>
          {breadcrumb && (
            <>
              <span className="text-ink-faint">/</span>
              <span className="text-[14px] font-extrabold text-navy">
                {breadcrumb}
              </span>
            </>
          )}
        </div>

        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <SearchBar />
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          {planBadge && (
            <PlanBadge planName={planBadge.name} tone={planBadge.tone} href="/billing?side=investor" />
          )}
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

      {/* Sub nav row */}
      <div className="mx-auto hidden max-w-6xl items-center gap-1 px-6 pb-1 md:flex">
        <SubNavLink href="/funder">Home</SubNavLink>
        <SubNavLink href="/funder/discover">Discover</SubNavLink>
        <SubNavLink href="/funder/saved">Saved</SubNavLink>
        <SubNavLink href="/funder/connects">Connects</SubNavLink>
        <SubNavLink href="/funder/thesis">Thesis</SubNavLink>
        <SubNavLink href="/messages">Messages</SubNavLink>
        <SubNavLink href="/billing?side=investor">Billing</SubNavLink>
      </div>
    </nav>
  );
}

function SubNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-[12px] font-semibold text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
    >
      {children}
    </Link>
  );
}
