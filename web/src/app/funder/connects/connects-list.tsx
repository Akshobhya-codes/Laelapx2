"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal } from "@/components/motion/reveal";
import { FunderNav } from "@/app/funder/discover/discover";

type ConnectRow = {
  id: string;
  submissionId: string;
  submissionSlug: string;
  companyName: string;
  oneLiner: string;
  status: "pending" | "accepted" | "declined";
  message: string | null;
  requestedAt: string;
  conversationId: string | null;
};

export function ConnectsList({
  displayName,
  profileImageUrl,
  connects,
}: {
  displayName: string | null;
  profileImageUrl: string | null;
  connects: ConnectRow[];
}) {
  const firstName = displayName?.split(" ")[0] || "you";
  const counts = {
    pending: connects.filter((c) => c.status === "pending").length,
    accepted: connects.filter((c) => c.status === "accepted").length,
    declined: connects.filter((c) => c.status === "declined").length,
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <FunderNav
        firstName={firstName}
        profileImageUrl={profileImageUrl}
        breadcrumb="Connects"
      />

      <header className="border-b border-ink/8 bg-paper-2 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue mb-3">
              Outgoing requests
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="text-[clamp(40px,5vw,64px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-navy">
              {connects.length === 0 ? (
                "No requests sent yet."
              ) : (
                <>
                  <span className="text-blue">{connects.length}</span>{" "}
                  connect{connects.length === 1 ? "" : "s"}
                </>
              )}
            </h1>
          </Reveal>
          {connects.length > 0 && (
            <Reveal delay={0.15}>
              <div className="mt-5 flex flex-wrap gap-2">
                <Pill tone="blue">
                  {counts.pending} pending
                </Pill>
                <Pill tone="green">
                  {counts.accepted} accepted
                </Pill>
                <Pill tone="muted">
                  {counts.declined} declined
                </Pill>
              </div>
            </Reveal>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {connects.length === 0 ? (
          <Reveal>
            <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-white p-14 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-ink/10 bg-paper text-[24px] text-blue">
                🤝
              </div>
              <div className="mt-5 text-[18px] font-bold text-ink">
                No connect requests yet.
              </div>
              <p className="mx-auto mt-2 max-w-md text-[14px] text-ink-soft">
                Find a startup that fits your thesis on{" "}
                <Link
                  href="/funder/discover"
                  className="font-bold text-blue hover:underline"
                >
                  Discover
                </Link>{" "}
                and click <span className="font-bold">Request connect</span> to
                send your first.
              </p>
            </div>
          </Reveal>
        ) : (
          <div className="space-y-3">
            {connects.map((c, i) => (
              <Reveal key={c.id} delay={i * 0.04}>
                <ConnectRowCard row={c} />
              </Reveal>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ConnectRowCard({ row }: { row: ConnectRow }) {
  const initials = row.companyName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const tone =
    row.status === "accepted"
      ? "border-flag-green/30 bg-flag-green/8"
      : row.status === "declined"
      ? "border-ink/10 bg-paper-2"
      : "border-blue/25 bg-gradient-to-br from-blue/[0.04] via-white to-white";

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-start ${tone}`}
    >
      <div className="flex items-start gap-4">
        <Link
          href={`/s/${row.submissionSlug}`}
          className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue to-navy text-[15px] font-black text-white transition-transform hover:-translate-y-0.5"
        >
          {initials}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/s/${row.submissionSlug}`}
            className="block text-[16px] font-extrabold tracking-tight text-navy transition-colors hover:text-blue"
          >
            {row.companyName}
          </Link>
          <p className="text-[12px] leading-snug text-ink-soft line-clamp-1">
            {row.oneLiner}
          </p>
          {row.message && (
            <div className="mt-3 rounded-md border border-ink/8 bg-paper p-3 text-[12px] leading-[1.5] text-ink">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
                Your message:
              </span>
              <br />
              {row.message}
            </div>
          )}
          <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Requested {relTime(row.requestedAt)}
          </div>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-3 sm:ml-auto">
        <StatusBadge status={row.status} />
        {row.status === "accepted" && row.conversationId && (
          <Link
            href={`/messages/${row.conversationId}`}
            className="rounded-md bg-navy px-3.5 py-2 text-[12px] font-bold text-white transition-colors hover:bg-blue"
          >
            Open thread →
          </Link>
        )}
      </div>
    </motion.div>
  );
}

function StatusBadge({
  status,
}: {
  status: "pending" | "accepted" | "declined";
}) {
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-flag-green/30 bg-flag-green/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-flag-green">
        ✓ Accepted
      </span>
    );
  }
  if (status === "declined") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint">
        Passed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-blue/30 bg-blue/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-blue">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue" />
      </span>
      Pending
    </span>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "blue" | "green" | "muted";
}) {
  const map = {
    blue: "border-blue/30 bg-blue/8 text-blue",
    green: "border-flag-green/30 bg-flag-green/10 text-flag-green",
    muted: "border-ink/10 bg-white text-ink-faint",
  };
  return (
    <span
      className={`rounded-full border px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.15em] ${map[tone]}`}
    >
      {children}
    </span>
  );
}

function relTime(iso: string): string {
  const sec = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
