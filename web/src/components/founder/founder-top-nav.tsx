"use client";

import Link from "next/link";
import clsx from "clsx";
import { NotificationsBell } from "@/components/notifications/bell";
import { PlanBadge } from "@/components/billing/locked-section";

/**
 * Nav for the founder-side utility pages (events, support). Mirrors the
 * founder workspace nav, with the founder tools as a sub-row.
 */
export function FounderTopNav({
  breadcrumb,
  firstName,
  profileImageUrl,
  planBadge,
  active,
}: {
  breadcrumb: string;
  firstName: string;
  profileImageUrl: string | null;
  planBadge: { name: string; tone: "neutral" | "paid" | "warn" };
  active: "events" | "support";
}) {
  return (
    <nav className="sticky top-0 z-20 border-b border-ink/8 bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-2 text-[14px]">
          <Link href="/" className="text-[16px] font-black tracking-tight text-navy">
            Laelapx<span className="text-blue">.</span>
          </Link>
          <span className="text-ink-faint">/</span>
          <Link
            href="/founder"
            className="text-[12px] font-bold uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-ink"
          >
            Founder
          </Link>
          <span className="text-ink-faint">/</span>
          <span className="font-extrabold text-navy">{breadcrumb}</span>
        </div>
        <div className="flex items-center gap-3">
          <PlanBadge planName={planBadge.name} tone={planBadge.tone} href="/billing?side=founder" />
          <NotificationsBell />
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
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-6 pb-1">
        <SubLink href="/founder">Projects</SubLink>
        <SubLink href="/events" active={active === "events"}>Events</SubLink>
        <SubLink href="/support" active={active === "support"}>Support</SubLink>
        <SubLink href="/messages">Messages</SubLink>
        <SubLink href="/billing?side=founder">Billing</SubLink>
      </div>
    </nav>
  );
}

function SubLink({ href, active = false, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={clsx(
        "rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors",
        active ? "bg-ink/5 text-ink" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
      )}
    >
      {children}
    </Link>
  );
}
