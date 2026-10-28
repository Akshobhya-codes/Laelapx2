"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Reveal } from "@/components/motion/reveal";
import { NotificationsBell } from "@/components/notifications/bell";
import {
  FOUNDER_REVIEW,
  formatPrice,
  type FounderFeatures,
} from "@/lib/billing/plans";
import type { InvestorQuota } from "@/lib/billing/entitlements";
import type { StoredTeamMember, ReviewOrderStatus } from "@/lib/insforge/billing";
import type { PaymentRecord } from "@/lib/billing/stripe";
import {
  openPortalAction,
  startPilotAction,
  orderFounderReviewAction,
  inviteTeammateAction,
  removeTeammateAction,
} from "@/app/actions/billing";

type Side = "founder" | "investor";

type Props = {
  side: Side;
  /** False once the user pays on exactly one side — see lib/billing/side.ts. */
  showSideToggle: boolean;
  /** Every charge on the account, from Stripe. Account-wide, not per side. */
  payments: PaymentRecord[];
  paymentsError: boolean;
  displayName: string | null;
  profileImageUrl: string | null;
  email: string | null;
  paymentsReady: boolean;
  notice: { checkout: string | null; review: string | null; notice: string | null };
  founder: {
    planId: string;
    planName: string;
    isPaid: boolean;
    status: string | null;
    cadence: string | null;
    renewsAt: string | null;
    cancelAtPeriodEnd: boolean;
    hasStripeSub: boolean;
    features: FounderFeatures;
  };
  investor: {
    planId: string | null;
    planName: string | null;
    active: boolean;
    status: string | null;
    renewsAt: string | null;
    cancelAtPeriodEnd: boolean;
    hasStripeSub: boolean;
    isTeamMember: boolean;
    teamName: string | null;
    seats: number;
    quota: InvestorQuota;
    pilotExhausted: boolean;
    teamAccess: boolean;
  };
  team: { id: string; name: string; members: StoredTeamMember[] } | null;
  submissions: { slug: string; name: string; hasDeck: boolean }[];
  reviewOrders: {
    id: string;
    status: ReviewOrderStatus;
    companyName: string | null;
    wantsCall: boolean;
    createdAt: string;
    deliveredAt: string | null;
    memoUrl: string | null;
    memoText: string | null;
  }[];
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export function BillingPage(props: Props) {
  const { side, showSideToggle, displayName, profileImageUrl, notice } = props;
  const firstName = displayName?.split(" ")[0] || "you";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <nav className="sticky top-0 z-20 border-b border-ink/8 bg-paper/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-[14px]">
            <Link href="/" className="text-[16px] font-black tracking-tight text-navy">
              Laelapx<span className="text-blue">.</span>
            </Link>
            <span className="text-ink-faint">/</span>
            <span className="font-extrabold text-navy">Billing</span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <Link
              href="/welcome"
              className="hidden text-[12px] font-semibold text-ink-soft hover:text-ink sm:inline"
            >
              Back to app
            </Link>
            <Link href="/u/me" className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-2 py-1">
              {profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileImageUrl} alt={firstName} width={24} height={24} className="h-6 w-6 rounded-full" />
              ) : (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-blue text-[10px] font-bold text-white">
                  {firstName[0]?.toUpperCase()}
                </span>
              )}
              <span className="hidden text-[12px] font-semibold text-ink-soft sm:inline">{firstName}</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <Reveal>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">Account</div>
              <h1 className="text-[clamp(32px,4vw,48px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-navy">
                Plans &amp; billing
              </h1>
            </div>
            {showSideToggle && (
              <div className="inline-flex rounded-full border border-ink/10 bg-white p-1">
                {(["founder", "investor"] as Side[]).map((s) => (
                  <Link
                    key={s}
                    href={`/billing?side=${s}`}
                    className={clsx(
                      "rounded-full px-4 py-1.5 text-[12px] font-bold transition-colors",
                      side === s ? "bg-navy text-white" : "text-ink-soft hover:text-ink"
                    )}
                  >
                    {s === "founder" ? "Founder" : "Investor"}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        <Notices notice={notice} />

        {side === "founder" ? <FounderPanel {...props} /> : <InvestorPanel {...props} />}

        <Reveal delay={0.12}>
          <PaymentHistory payments={props.payments} error={props.paymentsError} />
        </Reveal>
      </main>
    </div>
  );
}

/* ─── NOTICES ────────────────────────────────────────────────────────── */

function Notices({ notice }: { notice: Props["notice"] }) {
  const items: { tone: "ok" | "warn"; text: string }[] = [];
  if (notice.checkout === "success")
    items.push({ tone: "ok", text: "Payment received. Your plan activates within a few seconds — refresh if it hasn't yet." });
  if (notice.checkout === "cancelled") items.push({ tone: "warn", text: "Checkout cancelled. Nothing was charged." });
  if (notice.review === "paid")
    items.push({ tone: "ok", text: `Founder Review ordered. A reviewer will pick it up; expect the memo within ${FOUNDER_REVIEW.turnaroundDays} business days.` });
  if (notice.review === "cancelled") items.push({ tone: "warn", text: "Review order cancelled. Nothing was charged." });
  if (notice.notice === "use-portal")
    items.push({ tone: "warn", text: "You already have a plan on this side. Use “Manage plan” to switch — it prorates instead of double-billing." });
  if (!items.length) return null;
  return (
    <div className="mb-8 space-y-2">
      {items.map((n, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={clsx(
            "rounded-xl border px-5 py-3 text-[13px]",
            n.tone === "ok"
              ? "border-flag-green/30 bg-flag-green/10 text-ink"
              : "border-flag-amber/30 bg-flag-amber/10 text-ink"
          )}
        >
          {n.text}
        </motion.div>
      ))}
    </div>
  );
}

/* ─── PAYMENT HISTORY ────────────────────────────────────────────────── */

const PAY_STATUS: Record<PaymentRecord["status"], { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "bg-flag-green/15 text-flag-green" },
  open: { label: "Due", cls: "bg-flag-amber/15 text-flag-amber" },
  refunded: { label: "Refunded", cls: "bg-paper-2 text-ink-soft" },
  failed: { label: "Failed", cls: "bg-flag-red/10 text-flag-red" },
  void: { label: "Void", cls: "bg-paper-2 text-ink-faint" },
};

function PaymentHistory({ payments, error }: { payments: PaymentRecord[]; error: boolean }) {
  const total = payments.filter((p) => p.status === "paid").reduce((n, p) => n + p.amountCents, 0);
  return (
    <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-7">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">Payment history</div>
          <h3 className="text-[20px] font-extrabold tracking-tight text-navy">Every charge on your account</h3>
        </div>
        {payments.length > 0 && (
          <div className="text-right">
            <div className="text-[11px] font-semibold text-ink-faint">Total paid</div>
            <div className="text-[20px] font-extrabold text-navy">{formatPrice(total)}</div>
          </div>
        )}
      </div>

      {error ? (
        <p className="rounded-md border border-flag-amber/30 bg-flag-amber/10 px-4 py-3 text-[13px] text-ink">
          We couldn&apos;t load your payment history from Stripe just now. Refresh in a moment — your plan isn&apos;t affected.
        </p>
      ) : payments.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-ink-faint">No payments yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-ink/10 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Item</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-ink/5">
                  <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums text-ink-soft">{fmtDate(p.date)}</td>
                  <td className="py-2.5 pr-3">
                    <div className="font-semibold text-ink">{p.description}</div>
                    {p.reason && <div className="text-[11px] text-ink-faint">{p.reason}</div>}
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-right font-semibold tabular-nums text-ink">
                    {formatPrice(p.amountCents)}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]", PAY_STATUS[p.status].cls)}>
                      {PAY_STATUS[p.status].label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2.5 text-right">
                    {p.receiptUrl ? (
                      <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue hover:underline">
                        View
                      </a>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                    {p.pdfUrl && (
                      <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" className="ml-3 font-semibold text-blue hover:underline">
                        PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ─── FOUNDER ────────────────────────────────────────────────────────── */

function FounderPanel({ founder, paymentsReady, submissions, reviewOrders }: Props) {
  return (
    <div className="space-y-6">
      <Reveal>
        <PlanCard
          side="founder"
          planName={founder.planName}
          isPaid={founder.isPaid}
          status={founder.status}
          renewsAt={founder.renewsAt}
          cadence={founder.cadence}
          cancelAtPeriodEnd={founder.cancelAtPeriodEnd}
          hasStripeSub={founder.hasStripeSub}
          paymentsReady={paymentsReady}
          lines={[
            ["Full fundability report", founder.features.fullReport],
            ["Prioritized fixes", founder.features.prioritizedFixes],
            ["Investor-fit analysis", founder.features.investorFit],
            ["Investor visibility (with consent + thresholds)", founder.features.investorVisibility],
            ["Market signals + external fund research", founder.features.researchTools],
            ["Deep deck review + async support", founder.features.deepDeckReview],
          ]}
        />
      </Reveal>

      <Reveal delay={0.08}>
        <ReviewPanel
          submissions={submissions}
          orders={reviewOrders}
          paymentsReady={paymentsReady}
        />
      </Reveal>
    </div>
  );
}

/* ─── INVESTOR ───────────────────────────────────────────────────────── */

function InvestorPanel({ investor, team, paymentsReady, email }: Props) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const q = investor.quota;

  if (!investor.active) {
    return (
      <Reveal>
        <section className="rounded-2xl border-2 border-dashed border-ink/15 bg-white p-9 text-center">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
            Investor side
          </div>
          <h2 className="text-[24px] font-extrabold tracking-tight text-navy">
            {investor.pilotExhausted ? "Your pilot has ended." : "No investor plan yet."}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-ink-soft">
            {investor.pilotExhausted
              ? "Thanks for testing the matching. Pick a plan to keep the deal flow coming."
              : "Try the matching free for 60 days — 15 founder profiles against your criteria — or go straight to a plan."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!investor.pilotExhausted && (
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
                      setErr(e instanceof Error ? e.message : "Failed");
                    }
                  });
                }}
                className="rounded-md bg-navy px-5 py-2.5 text-[13px] font-bold text-white hover:bg-blue disabled:opacity-60"
              >
                {pending ? "Starting…" : "Start free pilot"}
              </button>
            )}
            <Link
              href="/pricing?side=investor"
              className="rounded-md border border-navy px-5 py-2.5 text-[13px] font-bold text-navy hover:bg-navy hover:text-white"
            >
              See investor plans
            </Link>
          </div>
          {err && <p className="mt-3 text-[12px] text-flag-red">{err}</p>}
        </section>
      </Reveal>
    );
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <PlanCard
          side="investor"
          planName={investor.planName ?? "—"}
          isPaid={investor.planId !== "pilot"}
          status={investor.status}
          renewsAt={investor.renewsAt}
          cadence="monthly"
          cancelAtPeriodEnd={investor.cancelAtPeriodEnd}
          hasStripeSub={investor.hasStripeSub && !investor.isTeamMember}
          paymentsReady={paymentsReady}
          memberNote={
            investor.isTeamMember
              ? `You're on ${investor.teamName ?? "a team"}'s plan. The account owner manages billing.`
              : null
          }
          isPilot={investor.planId === "pilot"}
          lines={[]}
        />
      </Reveal>

      {/* Quota */}
      <Reveal delay={0.06}>
        <section className="grid gap-4 sm:grid-cols-3">
          <Stat
            label={q.weekly === null ? "Profiles this week" : "Profiles left this week"}
            value={q.weekly === null ? "Unlimited" : `${q.remainingThisWeek} / ${q.weekly}`}
            helper={q.weekly === null ? "No weekly limit on this plan" : `Resets ${fmtDate(q.weekResetsAt)}`}
          />
          <Stat
            label={q.total === null ? "Unlocked so far" : "Pilot profiles left"}
            value={q.total === null ? String(q.usedTotal) : `${q.remainingTotal} / ${q.total}`}
            helper={q.total === null ? "Across the whole account" : "15 total during the pilot"}
          />
          <Stat
            label="Seats"
            value={`${(team?.members.length ?? 1)} / ${investor.seats}`}
            helper={investor.teamAccess ? "Invite teammates below" : "Single-seat plan"}
          />
        </section>
      </Reveal>

      {/* Team */}
      {team && (
        <Reveal delay={0.1}>
          <TeamPanel team={team} seats={investor.seats} ownerEmail={email} />
        </Reveal>
      )}
    </div>
  );
}

/* ─── SHARED: PLAN CARD ──────────────────────────────────────────────── */

function PlanCard({
  side,
  planName,
  isPaid,
  status,
  renewsAt,
  cadence,
  cancelAtPeriodEnd,
  hasStripeSub,
  paymentsReady,
  lines,
  memberNote = null,
  isPilot = false,
}: {
  side: Side;
  planName: string;
  isPaid: boolean;
  status: string | null;
  renewsAt: string | null;
  cadence: string | null;
  cancelAtPeriodEnd: boolean;
  hasStripeSub: boolean;
  paymentsReady: boolean;
  lines: [string, boolean][];
  memberNote?: string | null;
  isPilot?: boolean;
}) {
  const [pending, start] = useTransition();
  const pastDue = status === "past_due";

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
            {side === "founder" ? "Founder plan" : "Investor plan"}
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-[28px] font-extrabold tracking-tight text-navy">{planName}</h2>
            <span
              className={clsx(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]",
                pastDue
                  ? "bg-flag-amber/15 text-flag-amber"
                  : isPaid || isPilot
                  ? "bg-flag-green/15 text-flag-green"
                  : "bg-paper-2 text-ink-faint"
              )}
            >
              {pastDue ? "Payment failed" : isPilot ? "Pilot" : isPaid ? "Active" : "Free"}
            </span>
          </div>
          <div className="mt-1.5 text-[13px] text-ink-soft">
            {memberNote ??
              (isPilot
                ? `Pilot ends ${fmtDate(renewsAt)}.`
                : isPaid
                ? cancelAtPeriodEnd
                  ? `Cancels on ${fmtDate(renewsAt)}. You keep access until then.`
                  : `Renews ${fmtDate(renewsAt)} · billed ${cadence ?? "monthly"}.`
                : "Upgrade any time. Nothing you've submitted changes.")}
          </div>
          {pastDue && (
            <p className="mt-2 text-[13px] text-flag-amber">
              Your last payment didn&apos;t go through. Update the card in “Manage plan” to keep access.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {hasStripeSub ? (
            <button
              type="button"
              disabled={pending || !paymentsReady}
              onClick={() =>
                start(async () => {
                  await openPortalAction(side);
                })
              }
              className="rounded-md border border-navy px-4 py-2 text-[13px] font-bold text-navy transition-colors hover:bg-navy hover:text-white disabled:opacity-60"
            >
              {pending ? "Opening…" : "Manage plan"}
            </button>
          ) : null}
          {!memberNote && (
            <Link
              href={`/pricing?side=${side}`}
              className="rounded-md bg-navy px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-blue"
            >
              {isPaid || isPilot ? "Change plan" : "Upgrade"}
            </Link>
          )}
        </div>
      </div>

      {lines.length > 0 && (
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {lines.map(([label, on]) => (
            <li key={label} className={clsx("flex items-center gap-2.5 text-[13px]", on ? "text-ink" : "text-ink-faint")}>
              <span
                className={clsx(
                  "grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold",
                  on ? "bg-flag-green/15 text-flag-green" : "bg-paper-2 text-ink-faint"
                )}
              >
                {on ? "✓" : "–"}
              </span>
              {label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">{label}</div>
      <div className="mt-2 text-[26px] font-extrabold tracking-tight text-navy">{value}</div>
      <div className="mt-1 text-[12px] text-ink-soft">{helper}</div>
    </div>
  );
}

/* ─── TEAM ───────────────────────────────────────────────────────────── */

function TeamPanel({
  team,
  seats,
  ownerEmail,
}: {
  team: NonNullable<Props["team"]>;
  seats: number;
  ownerEmail: string | null;
}) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const members = team.members.length
    ? team.members
    : [{ id: "owner", teamId: "", userId: null, email: ownerEmail ?? "you", role: "owner" as const, status: "active" as const, invitedAt: "", joinedAt: null }];
  const full = members.length >= seats;

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">Team seats</div>
          <h3 className="text-[20px] font-extrabold tracking-tight text-navy">
            {team.name || "Your team"} · {members.length} of {seats}
          </h3>
          <p className="mt-1 text-[13px] text-ink-soft">
            Teammates share your deal flow, weekly quota, notes, and pipeline.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-ink/8 rounded-xl border border-ink/10">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold text-ink">{m.email}</div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-ink-faint">
                {m.role === "owner" ? "Owner" : m.status === "invited" ? "Invited — not signed in yet" : "Active"}
              </div>
            </div>
            {m.role === "member" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => start(async () => { await removeTeammateAction(m.id); })}
                className="text-[12px] font-semibold text-ink-faint hover:text-flag-red"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          start(async () => {
            const r = await inviteTeammateAction(email);
            setMsg(r.ok ? { ok: true, text: `Invite sent to ${email}.` } : { ok: false, text: r.error ?? "Failed" });
            if (r.ok) setEmail("");
          });
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={full ? "All seats in use" : "teammate@fund.com"}
          disabled={full || pending}
          className="flex-1 rounded-md border border-ink/10 bg-paper px-4 py-2.5 text-[14px] outline-none focus:border-blue focus:ring-4 focus:ring-blue/15 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={full || pending}
          className="rounded-md bg-navy px-5 py-2.5 text-[13px] font-bold text-white hover:bg-blue disabled:opacity-60"
        >
          {pending ? "Sending…" : "Invite"}
        </button>
      </form>
      {msg && <p className={clsx("mt-2 text-[12px]", msg.ok ? "text-flag-green" : "text-flag-red")}>{msg.text}</p>}
    </section>
  );
}

/* ─── FOUNDER REVIEW ─────────────────────────────────────────────────── */

const STATUS_LABEL: Record<ReviewOrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "In the queue",
  in_progress: "Reviewer working on it",
  delivered: "Delivered",
  refunded: "Refunded",
};

function ReviewPanel({
  submissions,
  orders,
  paymentsReady,
}: {
  submissions: Props["submissions"];
  orders: Props["reviewOrders"];
  paymentsReady: boolean;
}) {
  const [slug, setSlug] = useState<string>(submissions[0]?.slug ?? "");
  const [wantsCall, setWantsCall] = useState(true);
  const [notes, setNotes] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const chosen = submissions.find((s) => s.slug === slug);

  return (
    <section id="review" className="rounded-2xl border border-ink/10 bg-white p-7">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
        One-time · {formatPrice(FOUNDER_REVIEW.priceCents)}
      </div>
      <h3 className="text-[22px] font-extrabold tracking-tight text-navy">{FOUNDER_REVIEW.name}</h3>
      <p className="mt-1 max-w-xl text-[13px] text-ink-soft">
        A person on the Laelapx team reads your deck and writes you a memo with a
        fundraising-readiness plan. Optional 30–45 minute call. Typical turnaround{" "}
        {FOUNDER_REVIEW.turnaroundDays} business days.
      </p>

      <form
        className="mt-6 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setErr(null);
          start(async () => {
            try {
              await orderFounderReviewAction({ slug: slug || null, wantsCall, notes });
            } catch (e) {
              if (e && typeof e === "object" && "digest" in e) throw e;
              setErr(e instanceof Error ? e.message : "Failed");
            }
          });
        }}
      >
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">Which startup</span>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full rounded-md border border-ink/10 bg-paper px-4 py-2.5 text-[14px] outline-none focus:border-blue"
          >
            {submissions.length === 0 && <option value="">No submission yet — we&apos;ll ask for the deck by email</option>}
            {submissions.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}{s.hasDeck ? "" : " (no deck link yet)"}
              </option>
            ))}
          </select>
          {chosen && !chosen.hasDeck && (
            <span className="mt-1 block text-[12px] text-flag-amber">
              Add a pitch deck link to this submission first, or we&apos;ll email you for it.
            </span>
          )}
        </label>
        <label className="flex items-center gap-3 self-end rounded-md border border-ink/10 bg-paper px-4 py-2.5">
          <input type="checkbox" checked={wantsCall} onChange={(e) => setWantsCall(e.target.checked)} className="h-4 w-4" />
          <span className="text-[13px] font-semibold text-ink">Include the 30–45 min call</span>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">
            Anything you want us to focus on
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="E.g. we keep losing investors at the market-size slide."
            className="w-full rounded-md border border-ink/10 bg-paper px-4 py-2.5 text-[14px] outline-none focus:border-blue"
          />
        </label>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={pending || !paymentsReady}
            className="rounded-md bg-navy px-5 py-2.5 text-[13px] font-bold text-white hover:bg-blue disabled:opacity-60"
          >
            {pending ? "Opening checkout…" : `Order for ${formatPrice(FOUNDER_REVIEW.priceCents)}`}
          </button>
          <span className="text-[11px] italic text-ink-faint">
            A review improves the depth of feedback. It does not change your score or guarantee introductions.
          </span>
        </div>
        {err && <p className="sm:col-span-2 text-[12px] text-flag-red">{err}</p>}
      </form>

      {orders.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">Your reviews</div>
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="rounded-xl border border-ink/10 bg-paper p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[14px] font-bold text-ink">
                    {o.companyName ?? "Deck review"}{" "}
                    <span className="text-[12px] font-medium text-ink-faint">· ordered {fmtDate(o.createdAt)}</span>
                  </div>
                  <span
                    className={clsx(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em]",
                      o.status === "delivered" ? "bg-flag-green/15 text-flag-green" : "bg-blue/10 text-blue"
                    )}
                  >
                    {STATUS_LABEL[o.status]}
                  </span>
                </div>
                {o.status === "delivered" && (
                  <div className="mt-3 text-[13px] text-ink">
                    {o.memoUrl && (
                      <a href={o.memoUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-blue hover:underline">
                        Open the memo →
                      </a>
                    )}
                    {o.memoText && <p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink-soft">{o.memoText}</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
