"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";

/**
 * Founder dashboard: am I visible to investors, and if not, why not?
 * The verdict comes from lib/billing/visibility.ts; this only renders it.
 */
export function VisibilityCard({
  visible,
  blockers,
  completeness,
  fundability,
  editHref,
  isPaid,
}: {
  visible: boolean;
  blockers: string[];
  completeness: number;
  fundability: number;
  editHref: string;
  isPaid: boolean;
}) {
  const pct = Math.round(completeness * 100);
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(
        "mt-12 rounded-2xl border p-7",
        visible ? "border-flag-green/30 bg-flag-green/[0.04]" : "border-ink/10 bg-white"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-ink-faint">
            <span
              className={clsx("inline-block h-1.5 w-1.5 rounded-full", visible ? "bg-flag-green" : "bg-flag-amber")}
            />
            Investor visibility
          </div>
          <h3 className="text-[20px] font-extrabold tracking-tight text-navy">
            {visible
              ? "Investors whose thesis fits can find you."
              : isPaid
              ? "Not yet visible to investors."
              : "Investor visibility is off on the Free plan."}
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            {visible
              ? "You're opted in, your profile clears the completeness and fundability bars, and you'll show up for investors whose criteria you match. Being visible is not an introduction — investors still decide."
              : "Visibility needs four things: your consent, a complete profile, a fundability score above the bar, and a match against an investor's own criteria. Here's what's missing:"}
          </p>
          {!visible && blockers.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {blockers.map((b) => (
                <li key={b} className="flex items-start gap-2 text-[13px] leading-[1.55] text-ink">
                  <span className="mt-[6px] h-1 w-1 flex-shrink-0 rounded-full bg-flag-amber" />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-3">
          <div className="flex gap-4 text-right">
            <Meter label="Complete" value={pct} suffix="%" ok={pct >= 70} />
            <Meter label="Fundability" value={fundability} ok={fundability >= 45} />
          </div>
          {!isPaid ? (
            <Link href="/pricing" className="rounded-md bg-navy px-4 py-2 text-[12px] font-bold text-white hover:bg-blue">
              See Founder+ →
            </Link>
          ) : !visible ? (
            <Link href={editHref} className="rounded-md border border-navy px-4 py-2 text-[12px] font-bold text-navy hover:bg-navy hover:text-white">
              Edit submission →
            </Link>
          ) : null}
        </div>
      </div>
      <p className="mt-5 text-[11px] italic text-ink-faint">
        Paid status does not change your fundability score or investor-fit score.
      </p>
    </motion.section>
  );
}

function Meter({ label, value, suffix = "", ok }: { label: string; value: number; suffix?: string; ok: boolean }) {
  return (
    <div>
      <div className={clsx("text-[22px] font-extrabold leading-none tabular-nums", ok ? "text-flag-green" : "text-flag-amber")}>
        {value}{suffix}
      </div>
      <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-ink-faint">{label}</div>
    </div>
  );
}
