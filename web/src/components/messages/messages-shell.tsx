"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";
import { NotificationsBell } from "@/components/notifications/bell";
import { SearchBar } from "@/components/search/search-bar";
import type { ConversationListItem } from "@/lib/insforge/messages";

/* ─── TOP NAV ─────────────────────────────────────────────────────────── */
export function MessagesNav({
  firstName,
  profileImageUrl,
}: {
  firstName: string;
  profileImageUrl: string | null;
}) {
  return (
    <nav className="sticky top-0 z-20 border-b border-ink/8 bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex flex-shrink-0 items-center gap-2">
          <Link
            href="/"
            className="text-[16px] font-black tracking-tight text-navy"
          >
            Laelapx<span className="text-blue">.</span>
          </Link>
          <span className="text-ink-faint">/</span>
          <span className="text-[14px] font-extrabold text-navy">Messages</span>
        </div>
        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <SearchBar />
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          <Link
            href="/founder"
            className="hidden text-[12px] font-semibold text-ink-soft transition-colors hover:text-ink lg:inline"
          >
            Founder
          </Link>
          <Link
            href="/funder"
            className="hidden text-[12px] font-semibold text-ink-soft transition-colors hover:text-ink lg:inline"
          >
            Investor
          </Link>
          <NotificationsBell />
          <Link
            href="/u/me"
            className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-2 py-1 transition-colors hover:border-ink/25"
          >
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImageUrl}
                alt={firstName}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-blue text-[10px] font-bold text-white">
                {firstName[0]?.toUpperCase()}
              </span>
            )}
            <span className="hidden text-[12px] font-semibold text-ink-soft sm:inline">
              {firstName}
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─── CONVERSATION LIST ───────────────────────────────────────────────── */
export function ConversationList({
  conversations,
  activeId,
}: {
  conversations: ConversationListItem[];
  activeId?: string;
}) {
  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-[14px] font-bold text-ink">
          No conversations yet.
        </div>
        <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">
          When a founder accepts your connect request, your conversation
          starts here.
        </p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-ink/8">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/messages/${c.id}`}
            className={clsx(
              "block px-4 py-4 transition-colors hover:bg-paper-2",
              activeId === c.id && "bg-paper-2"
            )}
          >
            <ConversationRow item={c} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ConversationRow({ item }: { item: ConversationListItem }) {
  const initials = (item.otherDisplayName || "··")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue to-navy text-[12px] font-black text-white">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <div className="truncate text-[14px] font-extrabold text-navy">
            {item.otherDisplayName}
          </div>
          <div className="flex-shrink-0 text-[10px] uppercase tracking-[0.15em] text-ink-faint">
            {relTime(item.lastMessageAt)}
          </div>
        </div>
        <div className="text-[11px] uppercase tracking-[0.12em] text-ink-faint">
          {item.iAm === "founder" ? "← Investor" : `→ ${item.startupName}`}
        </div>
        {item.lastMessagePreview && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="truncate text-[12px] text-ink-soft">
              {item.lastMessagePreview}
            </span>
            {item.unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-blue px-1.5 text-[10px] font-extrabold text-white"
              >
                {item.unreadCount}
              </motion.span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  const sec = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return "now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
