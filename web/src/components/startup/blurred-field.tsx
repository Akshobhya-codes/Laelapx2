"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";

/**
 * LinkedIn-style blur — visible blurred text overlaid with a pill that
 * links to whatever would unlock it.
 *
 * Why something is locked is decided on the server (/s/[slug]) and passed
 * down once via <GateProvider>; every BlurredField on the page reads it
 * from context so the sections don't have to thread an extra prop.
 */

export type GateReason =
  /** Not signed in. */
  | "anon"
  /** Signed in, no investor plan (founder account, or investor without a plan). */
  | "no-plan"
  /** Investor plan is active but this week's / the pilot's profile quota is spent. */
  | "quota"
  /** Investor plan ended (pilot expired, subscription cancelled). */
  | "expired";

const GateContext = createContext<GateReason>("anon");

export function GateProvider({
  reason,
  children,
}: {
  reason: GateReason;
  children: React.ReactNode;
}) {
  return <GateContext.Provider value={reason}>{children}</GateContext.Provider>;
}

function ctaFor(reason: GateReason): { href: string; label: string; long: string } {
  switch (reason) {
    case "anon":
      return {
        href: "/handler/sign-in",
        label: "Sign in",
        long: "Sign in as an investor to unlock contact info.",
      };
    case "quota":
      return {
        href: "/billing?side=investor",
        label: "Limit reached",
        long: "You've used this week's profile unlocks. Upgrade for more, or come back when the week resets.",
      };
    case "expired":
      return {
        href: "/pricing?side=investor",
        label: "Renew",
        long: "Your investor plan has ended. Pick a plan to keep unlocking founders.",
      };
    case "no-plan":
    default:
      return {
        href: "/pricing?side=investor",
        label: "Investor plans",
        long: "Contact details are part of the investor plans.",
      };
  }
}

export function BlurredField({
  unlocked,
  preview,
  ariaLabel,
  variant = "inline",
  children,
}: {
  /** True = render content normally. False = blur with overlay. */
  unlocked: boolean;
  /** Faux preview text shown blurred (so the user knows there IS something). */
  preview?: string;
  /** When unlocked: the real URL to link to. Kept for call-site compatibility. */
  href?: string;
  ariaLabel?: string;
  /** Kept for call-site compatibility; the gate reason now comes from context. */
  viewerSignedIn?: boolean;
  variant?: "inline" | "card";
  /** Render the unlocked content (e.g. a styled link). */
  children?: React.ReactNode;
}) {
  const reason = useContext(GateContext);
  if (unlocked) return <>{children}</>;
  const cta = ctaFor(reason);

  if (variant === "card") {
    return (
      <Link
        href={cta.href}
        aria-label={ariaLabel ?? `${cta.label} to view`}
        className="group relative block overflow-hidden rounded-md border border-dashed border-current/30 bg-current/5 px-4 py-3 transition-colors hover:border-current/60"
      >
        <span
          aria-hidden="true"
          className="block select-none text-[13px] font-bold tracking-tight blur-[5px] [text-shadow:_0_0_8px_currentColor]"
        >
          {preview ?? "linkedin.com/in/private"}
        </span>
        <span className="absolute inset-0 flex items-center justify-center gap-2 backdrop-blur-[1px]">
          <span className="rounded-full border border-current/30 bg-current/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
            🔒 {cta.label} to view
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={cta.href}
      aria-label={ariaLabel ?? `${cta.label} to view`}
      className="group relative inline-flex items-center gap-1.5 rounded-md border border-dashed border-current/30 bg-current/5 px-2.5 py-1 align-middle text-[11px] font-bold uppercase tracking-[0.15em] transition-colors hover:border-current/60"
    >
      <span aria-hidden="true">🔒</span>
      <span className="opacity-90">{cta.label} to view</span>
    </Link>
  );
}

/* ─── BANNER (top of public page when blurred) ────────────────────────── */
export function GateBanner({
  reason,
  quotaNote,
}: {
  reason: GateReason;
  /** e.g. "0 of 5 left this week · resets Mon" */
  quotaNote?: string | null;
  /** Kept for call-site compatibility. */
  viewerSignedIn?: boolean;
}) {
  const cta = ctaFor(reason);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(
        "fixed left-1/2 top-20 z-50 -translate-x-1/2 px-4",
        "w-[calc(100%-2rem)] max-w-2xl"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-blue-light/35 bg-navy/90 px-5 py-2.5 text-[12px] font-medium text-white shadow-[0_8px_28px_rgba(28,43,66,0.32)] backdrop-blur-md">
        <span className="flex items-center gap-2">
          <span aria-hidden="true">🔒</span>
          <span>
            <span className="font-bold">
              {reason === "quota" ? "Weekly limit reached." : "Some details are hidden."}
            </span>{" "}
            <span className="text-white/65">
              {reason === "quota" && quotaNote ? quotaNote : cta.long}
            </span>
          </span>
        </span>
        <Link
          href={cta.href}
          className="rounded-full bg-blue-light px-3 py-1 text-[11px] font-bold text-navy transition-colors hover:bg-white"
        >
          {reason === "quota" ? "See plans" : cta.label} →
        </Link>
      </div>
    </motion.div>
  );
}

/** Small "unlocked this profile" toast for investors who just spent quota. */
export function UnlockToast({ remaining, weekly }: { remaining: number | null; weekly: number | null }) {
  if (weekly === null) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full border border-ink/10 bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-ink-soft shadow-[0_8px_24px_rgba(28,43,66,0.12)]"
    >
      Profile unlocked · {remaining} of {weekly} left this week
    </motion.div>
  );
}
