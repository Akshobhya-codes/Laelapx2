"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";

/**
 * A dashboard section the current plan doesn't include. Shows what's
 * behind it and which plan opens it. Sits where the real section would,
 * so the page keeps its shape.
 */
export function LockedSection({
  eyebrow,
  title,
  blurb,
  planName,
  href = "/pricing",
  bullets = [],
  compact = false,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  /** The plan that unlocks this. */
  planName: string;
  href?: string;
  bullets?: string[];
  compact?: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(
        "relative mt-12 overflow-hidden rounded-2xl border-2 border-dashed border-ink/15 bg-white",
        compact ? "p-6" : "p-7 sm:p-9"
      )}
    >
      {/* Faint "content behind glass" texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 22px, #1c2b42 22px, #1c2b42 23px)",
        }}
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-ink-faint">
            <span aria-hidden="true">🔒</span>
            {eyebrow}
          </div>
          <h3 className="text-[20px] font-extrabold tracking-tight text-navy">
            {title}
          </h3>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{blurb}</p>
          {bullets.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2 text-[13px] leading-[1.55] text-ink-soft"
                >
                  <span className="mt-[6px] h-1 w-1 flex-shrink-0 rounded-full bg-blue" />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link
          href={href}
          className="inline-flex flex-shrink-0 items-center gap-2 self-start rounded-md bg-navy px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-blue"
        >
          Included in {planName} →
        </Link>
      </div>
    </motion.section>
  );
}

/** Small inline pill for the nav: current plan + link to billing. */
export function PlanBadge({
  planName,
  tone = "neutral",
  href = "/billing",
}: {
  planName: string;
  tone?: "neutral" | "paid" | "warn";
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors sm:inline-flex",
        tone === "paid" && "border-blue/30 bg-blue/10 text-blue hover:bg-blue/15",
        tone === "warn" && "border-flag-amber/30 bg-flag-amber/10 text-flag-amber hover:bg-flag-amber/15",
        tone === "neutral" && "border-ink/10 bg-white text-ink-soft hover:border-ink/25 hover:text-ink"
      )}
    >
      {tone === "paid" && <span aria-hidden="true">✦</span>}
      {planName}
    </Link>
  );
}
