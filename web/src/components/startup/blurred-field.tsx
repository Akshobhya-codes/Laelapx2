"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";

/**
 * LinkedIn-style blur — visible blurred text overlaid with a soft "Subscribe"
 * pill that links to the appropriate auth/subscribe path.
 *
 * Use for any field that gives reach-out leverage: founder LinkedIn URLs,
 * pitch deck links, demo video URLs, etc.
 */
export function BlurredField({
  unlocked,
  preview,
  href,
  ariaLabel,
  viewerSignedIn = false,
  variant = "inline",
  children,
}: {
  /** True = render content normally. False = blur with overlay. */
  unlocked: boolean;
  /** Faux preview text shown blurred (so the user knows there IS something). */
  preview?: string;
  /** When unlocked: the real URL to link to. */
  href?: string;
  ariaLabel?: string;
  /** Signed-in users go to /funder/thesis; anonymous to /handler/sign-in. */
  viewerSignedIn?: boolean;
  variant?: "inline" | "card";
  /** Render the unlocked content (e.g. a styled link). */
  children?: React.ReactNode;
}) {
  if (unlocked) return <>{children}</>;

  // Where do we send the user to unlock?
  // - Not signed in → sign-in flow
  // - Signed in but no thesis → thesis intake (becomes "subscribed" investor)
  const ctaHref = viewerSignedIn ? "/funder/thesis" : "/handler/sign-in";
  const ctaLabel = viewerSignedIn ? "Set thesis" : "Sign in";

  if (variant === "card") {
    return (
      <Link
        href={ctaHref}
        aria-label={ariaLabel ?? "Sign in to view"}
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
            🔒 {ctaLabel} to view
          </span>
        </span>
      </Link>
    );
  }

  // Inline variant — small pill that replaces the link
  return (
    <Link
      href={ctaHref}
      aria-label={ariaLabel ?? "Sign in to view"}
      className="group relative inline-flex items-center gap-1.5 rounded-md border border-dashed border-current/30 bg-current/5 px-2.5 py-1 align-middle text-[11px] font-bold uppercase tracking-[0.15em] transition-colors hover:border-current/60"
    >
      <span aria-hidden="true">🔒</span>
      <span className="opacity-90">{ctaLabel} to view</span>
    </Link>
  );
}

/* ─── BANNER (top of public page when blurred) ────────────────────────── */
export function GateBanner({ viewerSignedIn }: { viewerSignedIn: boolean }) {
  const ctaHref = viewerSignedIn ? "/funder/thesis" : "/handler/sign-in";
  const ctaLabel = viewerSignedIn
    ? "Set up your investor thesis"
    : "Sign in";

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
            <span className="font-bold">Some details are hidden.</span>{" "}
            <span className="text-white/65">
              {viewerSignedIn
                ? "Set up your investor thesis to unlock."
                : "Sign in as an investor to unlock contact info."}
            </span>
          </span>
        </span>
        <Link
          href={ctaHref}
          className="rounded-full bg-blue-light px-3 py-1 text-[11px] font-bold text-navy transition-colors hover:bg-white"
        >
          {ctaLabel} →
        </Link>
      </div>
    </motion.div>
  );
}
