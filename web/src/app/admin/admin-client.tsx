"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Reveal } from "@/components/motion/reveal";
import { formatPrice } from "@/lib/billing/plans";
import type { ReviewOrderStatus } from "@/lib/insforge/billing";
import { adminUpdateReviewOrderAction } from "@/app/actions/billing";

type Person = { name: string; email: string | null };

type Props = {
  adminName: string | null;
  stats: { mrrCents: number; activeFounders: number; activeInvestors: number; openReviews: number };
  orders: {
    id: string;
    status: ReviewOrderStatus;
    founder: Person;
    companyName: string | null;
    slug: string | null;
    deckUrl: string | null;
    wantsCall: boolean;
    notes: string | null;
    memoUrl: string | null;
    memoText: string | null;
    createdAt: string;
    deliveredAt: string | null;
  }[];
  subscribers: {
    id: string;
    user: Person;
    side: "founder" | "investor";
    plan: string;
    status: string;
    active: boolean;
    cadence: string | null;
    renewsAt: string | null;
    seats: number;
    updatedAt: string;
  }[];
  feedback: {
    id: string;
    investor: Person;
    companyName: string;
    useful: boolean;
    note: string | null;
    createdAt: string;
  }[];
};

type Tab = "reviews" | "subscribers" | "pilot";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";

export function AdminPage({ adminName, stats, orders, subscribers, feedback }: Props) {
  const [tab, setTab] = useState<Tab>("reviews");
  const useful = feedback.filter((f) => f.useful).length;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <nav className="sticky top-0 z-20 border-b border-ink/8 bg-paper/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-[14px]">
            <Link href="/" className="text-[16px] font-black tracking-tight text-navy">
              Laelapx<span className="text-blue">.</span>
            </Link>
            <span className="text-ink-faint">/</span>
            <span className="font-extrabold text-navy">Admin</span>
          </div>
          <span className="text-[12px] text-ink-faint">{adminName}</span>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <Reveal>
          <div className="grid gap-4 sm:grid-cols-4">
            <Tile label="MRR" value={formatPrice(stats.mrrCents)} helper="Active plans, annual ÷ 12" />
            <Tile label="Paying founders" value={String(stats.activeFounders)} helper="Founder+ and Laelapx+" />
            <Tile label="Investor accounts" value={String(stats.activeInvestors)} helper="Including pilots" />
            <Tile label="Open reviews" value={String(stats.openReviews)} helper="Paid, not yet delivered" highlight={stats.openReviews > 0} />
          </div>
        </Reveal>

        <div className="mt-10 flex gap-1 border-b border-ink/8">
          {(
            [
              ["reviews", `Review queue (${orders.filter((o) => o.status !== "delivered" && o.status !== "refunded").length})`],
              ["subscribers", `Subscribers (${subscribers.length})`],
              ["pilot", `Pilot feedback (${feedback.length})`],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={clsx(
                "relative px-4 py-3 text-[13px] font-semibold transition-colors",
                tab === t ? "text-navy" : "text-ink-faint hover:text-ink"
              )}
            >
              {label}
              {tab === t && <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-blue" />}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === "reviews" && (
            orders.length === 0 ? (
              <Empty>No review orders yet. They&apos;ll appear here the moment a founder pays.</Empty>
            ) : (
              <ul className="space-y-4">
                {orders.map((o) => <OrderCard key={o.id} order={o} />)}
              </ul>
            )
          )}

          {tab === "subscribers" && (
            subscribers.length === 0 ? (
              <Empty>No subscriptions yet.</Empty>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
                <table className="w-full text-[13px]">
                  <thead className="bg-paper-2 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint">
                    <tr>
                      <th className="px-4 py-3">Who</th>
                      <th className="px-4 py-3">Side</th>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Renews / ends</th>
                      <th className="px-4 py-3">Seats</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/8">
                    {subscribers.map((s) => (
                      <tr key={s.id} className={clsx(!s.active && "opacity-50")}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-ink">{s.user.name}</div>
                          <div className="text-[11px] text-ink-faint">{s.user.email ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3 capitalize">{s.side}</td>
                        <td className="px-4 py-3 font-semibold">{s.plan}{s.cadence === "annual" ? " · annual" : ""}</td>
                        <td className="px-4 py-3">
                          <span className={clsx(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
                            s.status === "active" || s.status === "trialing" ? "bg-flag-green/15 text-flag-green"
                              : s.status === "past_due" ? "bg-flag-amber/15 text-flag-amber"
                              : "bg-paper-2 text-ink-faint"
                          )}>{s.status.replace("_", " ")}</span>
                        </td>
                        <td className="px-4 py-3">{fmt(s.renewsAt)}</td>
                        <td className="px-4 py-3">{s.seats}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === "pilot" && (
            <>
              <div className="mb-5 rounded-xl border border-ink/10 bg-white p-5 text-[13px] text-ink-soft">
                <span className="text-[22px] font-extrabold text-navy">{feedback.length ? Math.round((useful / feedback.length) * 100) : 0}%</span>{" "}
                of matches rated useful · {useful} of {feedback.length} responses
              </div>
              {feedback.length === 0 ? (
                <Empty>No pilot feedback yet. Pilot investors are asked “was this useful?” on every profile they open.</Empty>
              ) : (
                <ul className="divide-y divide-ink/8 rounded-xl border border-ink/10 bg-white">
                  {feedback.map((f) => (
                    <li key={f.id} className="flex items-start gap-4 px-5 py-4">
                      <span className={clsx(
                        "mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full text-[11px] font-bold",
                        f.useful ? "bg-flag-green/15 text-flag-green" : "bg-flag-red/15 text-flag-red"
                      )}>{f.useful ? "✓" : "✕"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px]">
                          <span className="font-semibold text-ink">{f.investor.name}</span>
                          <span className="text-ink-faint"> on </span>
                          <span className="font-semibold text-ink">{f.companyName}</span>
                          <span className="text-ink-faint"> · {fmt(f.createdAt)}</span>
                        </div>
                        {f.note && <p className="mt-1 text-[13px] text-ink-soft">{f.note}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Tile({ label, value, helper, highlight = false }: { label: string; value: string; helper: string; highlight?: boolean }) {
  return (
    <div className={clsx("rounded-xl border bg-white p-5", highlight ? "border-blue/40" : "border-ink/10")}>
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">{label}</div>
      <div className="mt-2 text-[28px] font-extrabold tracking-tight text-navy">{value}</div>
      <div className="mt-1 text-[12px] text-ink-soft">{helper}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-white p-12 text-center text-[13px] text-ink-soft">
      {children}
    </div>
  );
}

const NEXT: Partial<Record<ReviewOrderStatus, { label: string; to: "in_progress" | "delivered" }>> = {
  paid: { label: "Start review", to: "in_progress" },
  in_progress: { label: "Mark delivered", to: "delivered" },
};

function OrderCard({ order }: { order: Props["orders"][number] }) {
  const [memoUrl, setMemoUrl] = useState(order.memoUrl ?? "");
  const [memoText, setMemoText] = useState(order.memoText ?? "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const next = NEXT[order.status];
  const done = order.status === "delivered" || order.status === "refunded";

  const submit = (status: "in_progress" | "delivered" | "refunded") => {
    setErr(null);
    if (status === "delivered" && !memoUrl.trim() && !memoText.trim()) {
      setErr("Add a memo link or paste the memo before marking delivered.");
      return;
    }
    start(async () => {
      try {
        await adminUpdateReviewOrderAction({ orderId: order.id, status, memoUrl, memoText });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      }
    });
  };

  return (
    <li id={`order-${order.id}`} className={clsx("rounded-2xl border bg-white p-6", done ? "border-ink/10 opacity-70" : "border-blue/30")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[16px] font-extrabold text-navy">
            {order.companyName ?? "No submission attached"}
            {order.slug && (
              <Link href={`/s/${order.slug}`} target="_blank" className="ml-2 text-[12px] font-semibold text-blue hover:underline">
                public page ↗
              </Link>
            )}
          </div>
          <div className="mt-0.5 text-[13px] text-ink-soft">
            {order.founder.name} · {order.founder.email ?? "no email"} · ordered {fmt(order.createdAt)}
            {order.wantsCall && <span className="ml-2 rounded-full bg-blue/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue">wants call</span>}
          </div>
        </div>
        <span className="rounded-full bg-paper-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-soft">
          {order.status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
        <div className="rounded-lg bg-paper p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint">Deck</div>
          {order.deckUrl ? (
            <a href={order.deckUrl} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-blue hover:underline">{order.deckUrl}</a>
          ) : (
            <span className="text-flag-amber">Not provided — email the founder.</span>
          )}
        </div>
        <div className="rounded-lg bg-paper p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint">Founder&apos;s notes</div>
          <div className="text-ink-soft">{order.notes ?? "—"}</div>
        </div>
      </div>

      {!done && (
        <div className="mt-4 grid gap-3">
          <input
            value={memoUrl}
            onChange={(e) => setMemoUrl(e.target.value)}
            placeholder="Memo link (Google Doc, Notion, PDF…)"
            className="rounded-md border border-ink/10 bg-paper px-4 py-2 text-[13px] outline-none focus:border-blue"
          />
          <textarea
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            rows={3}
            placeholder="…or paste the memo text here"
            className="rounded-md border border-ink/10 bg-paper px-4 py-2 text-[13px] outline-none focus:border-blue"
          />
          <div className="flex flex-wrap items-center gap-2">
            {next && (
              <button
                type="button"
                disabled={pending}
                onClick={() => submit(next.to)}
                className="rounded-md bg-navy px-4 py-2 text-[12px] font-bold text-white hover:bg-blue disabled:opacity-60"
              >
                {pending ? "Saving…" : next.label}
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => submit("refunded")}
              className="text-[12px] font-semibold text-ink-faint hover:text-flag-red"
            >
              Mark refunded
            </button>
            {err && <span className="text-[12px] text-flag-red">{err}</span>}
          </div>
        </div>
      )}
      {done && order.memoUrl && (
        <a href={order.memoUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[13px] font-bold text-blue hover:underline">
          Memo →
        </a>
      )}
    </li>
  );
}
