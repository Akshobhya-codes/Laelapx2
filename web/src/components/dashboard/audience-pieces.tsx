"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Reveal } from "@/components/motion/reveal";
import { respondConnectAction } from "@/app/actions/investor";
import type { ViewBucket, IncomingConnect } from "@/lib/insforge/audience";

/* ─── STAT CARD (animated count-up) ───────────────────────────────────── */
export function AudienceStatCard({
  label,
  value,
  helper,
  highlight = false,
  delay = 0,
}: {
  label: string;
  value: number;
  helper?: string;
  highlight?: boolean;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <div
        className={`rounded-2xl border p-6 ${
          highlight
            ? "border-blue/30 bg-gradient-to-br from-blue/[0.08] via-white to-white"
            : "border-ink/10 bg-white"
        }`}
      >
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-faint">
          {label}
        </div>
        <div
          className={`mt-2 text-[clamp(36px,4vw,52px)] font-extrabold leading-none tracking-[-0.03em] tabular-nums ${
            highlight ? "text-blue" : "text-navy"
          }`}
        >
          <AnimatedNumber value={value} />
        </div>
        {helper && (
          <div className="mt-2 text-[11px] text-ink-faint">{helper}</div>
        )}
      </div>
    </Reveal>
  );
}

/* ─── SPARKLINE (SVG, animated path draw) ─────────────────────────────── */
export function Sparkline({ buckets }: { buckets: ViewBucket[] }) {
  const W = 600;
  const H = 80;
  const padX = 0;
  const padY = 8;

  if (buckets.length === 0) {
    return (
      <div className="mt-4 flex h-[80px] items-center justify-center text-[12px] text-ink-faint">
        No views recorded.
      </div>
    );
  }

  const max = Math.max(1, ...buckets.map((b) => b.count));
  const stepX = (W - padX * 2) / Math.max(1, buckets.length - 1);

  const points = buckets.map((b, i) => {
    const x = padX + i * stepX;
    const y = padY + (H - padY * 2) * (1 - b.count / max);
    return [x, y] as const;
  });

  // Smooth curve via cubic Bezier between points (Catmull-Rom-ish).
  const linePath = points
    .map((p, i, arr) => {
      if (i === 0) return `M ${p[0]} ${p[1]}`;
      const prev = arr[i - 1];
      const cx = (prev[0] + p[0]) / 2;
      return `C ${cx} ${prev[1]}, ${cx} ${p[1]}, ${p[0]} ${p[1]}`;
    })
    .join(" ");

  // Filled area under the curve.
  const areaPath = `${linePath} L ${points[points.length - 1][0]} ${H} L ${points[0][0]} ${H} Z`;

  return (
    <div className="mt-5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-[80px] w-full overflow-visible"
      >
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c5ba8" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2c5ba8" stopOpacity="0" />
          </linearGradient>
        </defs>

        <motion.path
          d={areaPath}
          fill="url(#sparkFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        />

        <motion.path
          d={linePath}
          fill="none"
          stroke="#2c5ba8"
          strokeWidth={2}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />

        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={3}
            fill={buckets[i].count > 0 ? "#2c5ba8" : "transparent"}
            stroke="#fff"
            strokeWidth={1.5}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.3,
              delay: 0.6 + i * 0.04,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        ))}
      </svg>

      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.18em] text-ink-faint tabular-nums">
        <span>{shortDate(buckets[0].date)}</span>
        <span>{shortDate(buckets[buckets.length - 1].date)}</span>
      </div>
    </div>
  );
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ─── CONNECT INBOX CARD ─────────────────────────────────────────────── */
export function ConnectInboxCard({
  connect,
  ownerSlug,
}: {
  connect: IncomingConnect;
  ownerSlug: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState<"accepted" | "declined" | null>(
    null
  );

  const handle = (accept: boolean) => {
    startTransition(async () => {
      try {
        await respondConnectAction(connect.id, accept, ownerSlug);
        setResolved(accept ? "accepted" : "declined");
      } catch {
        // surface via toast in v2
      }
    });
  };

  if (resolved) {
    return (
      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 0.7 }}
        className={clsx(
          "rounded-xl border p-5",
          resolved === "accepted"
            ? "border-flag-green/30 bg-flag-green/8"
            : "border-ink/10 bg-paper-2"
        )}
      >
        <div className="text-[13px] font-bold text-ink">
          {connect.fundName || "Unnamed fund"} — {resolved}
        </div>
      </motion.div>
    );
  }

  const initials = (connect.fundName || connect.partnerName || "··")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const fitTone =
    connect.fit === null
      ? "border-ink/10 bg-paper text-ink-faint"
      : connect.fit >= 85
      ? "border-flag-green/30 bg-flag-green/10 text-flag-green"
      : connect.fit >= 65
      ? "border-blue/30 bg-blue/10 text-blue"
      : "border-flag-amber/30 bg-flag-amber/10 text-flag-amber";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="rounded-xl border border-blue/25 bg-gradient-to-br from-blue/[0.04] via-white to-white p-5"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue to-navy text-[13px] font-black text-white">
            {initials}
          </div>
          <div className="min-w-0">
            {connect.fundSlug ? (
              <Link
                href={`/v/${connect.fundSlug}`}
                className="block truncate text-[15px] font-extrabold tracking-tight text-navy transition-colors hover:text-blue"
              >
                {connect.fundName || "Unnamed fund"}
              </Link>
            ) : (
              <div className="truncate text-[15px] font-extrabold tracking-tight text-navy">
                {connect.fundName || "Unnamed fund"}
              </div>
            )}
            <div className="text-[12px] text-ink-faint">
              {connect.partnerName ?? "—"}
            </div>
          </div>
        </div>
        {connect.fit !== null && (
          <div
            className={`flex flex-col items-end rounded-md border px-2 py-0.5 ${fitTone}`}
          >
            <span className="text-[12px] font-extrabold leading-none tabular-nums">
              {connect.fit}
              <span className="text-[8px] font-bold opacity-70">%</span>
            </span>
            <span className="text-[7px] font-bold uppercase tracking-[0.2em] opacity-70">
              Fit
            </span>
          </div>
        )}
      </div>

      {connect.thesisOneLiner && (
        <p className="mb-3 text-[12px] italic leading-[1.5] text-ink-soft line-clamp-2">
          “{connect.thesisOneLiner}”
        </p>
      )}

      {connect.message && (
        <div className="mb-4 rounded-md border border-ink/8 bg-paper p-3 text-[13px] leading-[1.55] text-ink">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">
            Their note:
          </span>
          <br />
          {connect.message}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <motion.button
          type="button"
          onClick={() => handle(false)}
          disabled={isPending}
          whileTap={{ scale: 0.96 }}
          className="rounded-md border border-ink/10 bg-white px-3.5 py-2 text-[12px] font-bold text-ink-soft transition-colors hover:border-ink/25 hover:text-ink disabled:opacity-60"
        >
          Decline
        </motion.button>
        <motion.button
          type="button"
          onClick={() => handle(true)}
          disabled={isPending}
          whileTap={{ scale: 0.96 }}
          className="rounded-md bg-navy px-3.5 py-2 text-[12px] font-bold text-white transition-colors hover:bg-blue disabled:opacity-60"
        >
          {isPending ? "…" : "Accept connect"}
        </motion.button>
      </div>
    </motion.div>
  );
}
