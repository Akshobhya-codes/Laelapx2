"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";
import { FunderNav } from "@/app/funder/discover/discover";
import { Reveal } from "@/components/motion/reveal";
import { LockedSection } from "@/components/billing/locked-section";
import { formatUsdShort } from "@/components/motion/animated-number";
import { PIPELINE_STAGES, DECISIONS } from "@/lib/billing/pipeline";
import { moveDealAction, assignDealAction, decideDealAction } from "@/app/actions/workspace";

export type PipelineCard = {
  slug: string;
  name: string;
  oneLiner: string;
  stage: string;
  raisingUsd: number;
  fit: number | null;
  pipelineStage: string | null;
  note: string | null;
  assignedTo: string | null;
  decision: "advance" | "hold" | "pass" | null;
  decidedBy: string | null;
  decidedAt: string | null;
  meetings: number;
  lastMeeting: string | null;
  updatedAt: string | null;
};

type Person = { userId: string; name: string; isOwner: boolean };

const UNSORTED = "Unsorted";
const COLUMNS = [UNSORTED, ...PIPELINE_STAGES];

const fmtDay = (d: string) =>
  new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function PipelineBoard({
  displayName,
  profileImageUrl,
  planBadge,
  locked,
  cards,
  people,
  can,
  currentUserId,
  teamName,
}: {
  displayName: string | null;
  profileImageUrl: string | null;
  planBadge: { name: string; tone: "neutral" | "paid" | "warn" };
  locked: boolean;
  cards: PipelineCard[];
  people: Person[];
  can: { move: boolean; assign: boolean; decide: boolean; meetings: boolean };
  currentUserId: string;
  teamName: string | null;
}) {
  const firstName = displayName?.split(" ")[0] || "you";
  const [mineOnly, setMineOnly] = useState(false);

  const shown = mineOnly ? cards.filter((c) => c.assignedTo === currentUserId) : cards;
  const byColumn = useMemo(() => {
    const m = new Map<string, PipelineCard[]>(COLUMNS.map((c) => [c, []]));
    for (const c of shown) m.get(c.pipelineStage ?? UNSORTED)?.push(c);
    return m;
  }, [shown]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <FunderNav firstName={firstName} profileImageUrl={profileImageUrl} breadcrumb="Pipeline" planBadge={planBadge} />

      <header className="border-b border-ink/8 bg-paper-2 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
              {teamName ? `${teamName} · shared pipeline` : "Pipeline"}
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="text-[clamp(36px,4.5vw,56px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-navy">
              {locked ? "Your deal pipeline." : (
                <><span className="text-blue">{cards.length}</span> deal{cards.length === 1 ? "" : "s"} in flight.</>
              )}
            </h1>
          </Reveal>
          {!locked && (
            <Reveal delay={0.12}>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
                Every founder your account has opened. Move them through stages
                {can.meetings ? ", log meetings from their profile" : ""}
                {can.decide ? ", assign owners and record partner decisions" : ""}.
              </p>
            </Reveal>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-10">
        {locked ? (
          <div className="mx-auto max-w-6xl">
            <LockedSection
              eyebrow="Pipeline dashboard"
              title="One board for every deal your team is working."
              blurb="Each founder you open lands here. Move deals through stages, see who owns what, and keep the team on the same page."
              planName="Micro Fund"
              href="/pricing?side=investor"
              bullets={[
                "Kanban board across New → Invested",
                "Shared across your team seats",
                "Meeting tracking on Emerging Fund, partner workflow on Institutional",
              ]}
            />
          </div>
        ) : cards.length === 0 ? (
          <div className="mx-auto max-w-6xl rounded-2xl border-2 border-dashed border-ink/15 bg-white p-14 text-center">
            <div className="text-[15px] font-semibold text-ink">Nothing on the board yet.</div>
            <p className="mt-2 text-[13px] text-ink-soft">
              Open a founder from{" "}
              <Link href="/funder/discover" className="font-semibold text-blue hover:underline">Discover</Link>{" "}
              and they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <>
            {can.assign && (
              <div className="mb-5 flex items-center gap-2 text-[12px]">
                <button
                  type="button"
                  onClick={() => setMineOnly(false)}
                  className={clsx("rounded-full border px-3 py-1 font-semibold", !mineOnly ? "border-navy bg-navy text-white" : "border-ink/10 bg-white text-ink-soft")}
                >
                  All deals
                </button>
                <button
                  type="button"
                  onClick={() => setMineOnly(true)}
                  className={clsx("rounded-full border px-3 py-1 font-semibold", mineOnly ? "border-navy bg-navy text-white" : "border-ink/10 bg-white text-ink-soft")}
                >
                  Assigned to me
                </button>
              </div>
            )}
            <div className="flex gap-4 overflow-x-auto pb-6">
              {COLUMNS.map((col) => {
                const list = byColumn.get(col) ?? [];
                return (
                  <section key={col} className="flex w-[280px] flex-shrink-0 flex-col">
                    <div className="mb-3 flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft">{col}</span>
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-bold text-ink-faint">{list.length}</span>
                    </div>
                    <div className="flex min-h-[120px] flex-col gap-3 rounded-xl bg-paper-2/60 p-2">
                      {list.map((c) => (
                        <DealCard key={c.slug} card={c} people={people} can={can} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function DealCard({
  card,
  people,
  can,
}: {
  card: PipelineCard;
  people: Person[];
  can: { move: boolean; assign: boolean; decide: boolean; meetings: boolean };
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setErr(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "Failed");
    });
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: pending ? 0.6 : 1, y: 0 }}
      className="rounded-lg border border-ink/10 bg-white p-3.5 shadow-[0_1px_2px_rgba(28,43,66,0.04)]"
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/s/${card.slug}`} prefetch={false} className="min-w-0">
          <div className="truncate text-[14px] font-extrabold tracking-tight text-navy hover:text-blue">{card.name}</div>
          <div className="text-[11px] text-ink-faint">
            {card.stage} · {formatUsdShort(card.raisingUsd)}
          </div>
        </Link>
        {card.fit !== null && (
          <span className="flex-shrink-0 rounded-md border border-blue/25 bg-blue/8 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-blue">
            {card.fit}%
          </span>
        )}
      </div>

      {card.note && <p className="mt-2 line-clamp-2 text-[12px] leading-[1.45] text-ink-soft">{card.note}</p>}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {can.meetings && card.meetings > 0 && (
          <span className="rounded bg-paper-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-soft">
            {card.meetings} meeting{card.meetings === 1 ? "" : "s"}{card.lastMeeting ? ` · last ${fmtDay(card.lastMeeting)}` : ""}
          </span>
        )}
        {card.decision && (
          <span
            title={card.decidedBy && card.decidedAt ? `${card.decidedBy} · ${fmtDay(card.decidedAt)}` : undefined}
            className={clsx(
              "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
              card.decision === "advance" && "bg-flag-green/15 text-flag-green",
              card.decision === "hold" && "bg-flag-amber/15 text-flag-amber",
              card.decision === "pass" && "bg-ink/8 text-ink-faint"
            )}
          >
            {card.decision}{card.decidedBy ? ` · ${card.decidedBy.split(" ")[0]}` : ""}
          </span>
        )}
      </div>

      {(can.move || can.assign) && (
        <div className="mt-3 grid gap-1.5">
          {can.move && (
            <select
              aria-label="Stage"
              value={card.pipelineStage ?? ""}
              disabled={pending}
              onChange={(e) => run(() => moveDealAction(card.slug, e.target.value || null))}
              className="w-full rounded-md border border-ink/10 bg-paper px-2 py-1 text-[12px] outline-none focus:border-blue"
            >
              <option value="">{UNSORTED}</option>
              {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {can.assign && (
            <select
              aria-label="Owner"
              value={card.assignedTo ?? ""}
              disabled={pending}
              onChange={(e) => run(() => assignDealAction(card.slug, e.target.value || null))}
              className="w-full rounded-md border border-ink/10 bg-paper px-2 py-1 text-[12px] outline-none focus:border-blue"
            >
              <option value="">Unassigned</option>
              {people.map((p) => <option key={p.userId} value={p.userId}>{p.name}{p.isOwner ? " (owner)" : ""}</option>)}
            </select>
          )}
        </div>
      )}

      {can.decide && (
        <div className="mt-2 flex gap-1">
          {DECISIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              disabled={pending}
              onClick={() => run(() => decideDealAction(card.slug, card.decision === d.id ? null : d.id))}
              className={clsx(
                "flex-1 rounded border px-1.5 py-1 text-[11px] font-bold transition-colors",
                card.decision === d.id ? "border-navy bg-navy text-white" : "border-ink/10 text-ink-soft hover:border-ink/30"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}
      {err && <p className="mt-1.5 text-[11px] text-flag-red">{err}</p>}
    </motion.article>
  );
}
