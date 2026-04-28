"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchNotificationsAction,
  markAllReadAction,
  markReadAction,
} from "@/app/actions/notifications";
import type { StoredNotification, NotificationKind } from "@/lib/insforge/notifications";

const POLL_MS = 30_000;

const KIND_META: Record<NotificationKind, { icon: string; color: string }> = {
  view: { icon: "👁", color: "bg-blue/15 text-blue" },
  save: { icon: "★", color: "bg-flag-amber/15 text-flag-amber" },
  connect_requested: { icon: "🤝", color: "bg-blue/15 text-blue" },
  connect_accepted: {
    icon: "✓",
    color: "bg-flag-green/15 text-flag-green",
  },
  connect_declined: { icon: "✕", color: "bg-ink/8 text-ink-faint" },
  message_received: { icon: "💬", color: "bg-blue-light/20 text-blue" },
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<StoredNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch on mount + poll every POLL_MS.
  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const res = await fetchNotificationsAction();
        if (cancelled) return;
        setNotifs(res.notifications);
        setUnread(res.unread);
      } catch {
        // soft-fail
      }
    };
    fetchOnce();
    const id = setInterval(fetchOnce, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onMarkAll = () => {
    startTransition(async () => {
      try {
        await markAllReadAction();
        const now = new Date().toISOString();
        setNotifs((cur) =>
          cur.map((n) => (n.readAt ? n : { ...n, readAt: now }))
        );
        setUnread(0);
      } catch {
        /* soft-fail */
      }
    });
  };

  const onClickItem = (n: StoredNotification) => {
    setOpen(false);
    if (!n.readAt) {
      startTransition(async () => {
        try {
          await markReadAction(n.id);
        } catch {
          /* soft-fail */
        }
      });
      setNotifs((cur) =>
        cur.map((x) =>
          x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x
        )
      );
      setUnread((u) => Math.max(0, u - 1));
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications (${unread} unread)`}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-ink/10 bg-white text-ink-soft transition-colors hover:border-ink/25 hover:text-ink"
      >
        <BellIcon />
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute -right-1 -top-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-flag-red px-1 text-[10px] font-extrabold text-white shadow-[0_2px_6px_rgba(196,64,64,0.35)]"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-12 z-30 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_18px_60px_rgba(28,43,66,0.18)]"
          >
            <div className="flex items-center justify-between border-b border-ink/8 bg-paper-2 px-4 py-3">
              <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-ink-soft">
                Notifications
              </div>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={onMarkAll}
                  className="text-[11px] font-semibold text-blue transition-colors hover:text-blue-light"
                >
                  Mark all read
                </button>
              ) : (
                <span className="text-[11px] font-semibold text-ink-faint">
                  Up to date
                </span>
              )}
            </div>

            <div className="max-h-[440px] overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-[14px] font-semibold text-ink">
                    Nothing yet.
                  </div>
                  <p className="mt-1 text-[12px] text-ink-faint">
                    When investors view, save, or connect with you, you&apos;ll
                    see it here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-ink/8">
                  {notifs.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onClick={() => onClickItem(n)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationRow({
  notification: n,
  onClick,
}: {
  notification: StoredNotification;
  onClick: () => void;
}) {
  const meta = KIND_META[n.kind];
  const Inner = (
    <div className="flex items-start gap-3 p-4 transition-colors hover:bg-paper-2">
      <div
        className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-[13px] ${meta.color}`}
      >
        {meta.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[13px] font-bold leading-tight text-ink">
            {titleFor(n)}
          </div>
          {!n.readAt && (
            <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue" />
          )}
        </div>
        {bodyFor(n) && (
          <div className="mt-0.5 text-[12px] leading-snug text-ink-soft line-clamp-2">
            {bodyFor(n)}
          </div>
        )}
        <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-ink-faint">
          {relativeTime(n.createdAt)}
        </div>
      </div>
    </div>
  );

  if (n.href) {
    return (
      <li>
        <Link href={n.href} onClick={onClick} className="block">
          {Inner}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left"
      >
        {Inner}
      </button>
    </li>
  );
}

function titleFor(n: StoredNotification): string {
  const fund = n.payload.fundName;
  const startup = n.payload.startupName;
  const from = n.payload.fromName ?? n.payload.fundName ?? "Someone";
  switch (n.kind) {
    case "view":
      return `${fund ?? "An investor"} viewed ${startup ?? "your startup"}`;
    case "save":
      return `${fund ?? "An investor"} saved ${startup ?? "your startup"}`;
    case "connect_requested":
      return `${fund ?? "An investor"} wants to connect`;
    case "connect_accepted":
      return `${startup ?? "Founder"} accepted your connect request`;
    case "connect_declined":
      return `${startup ?? "Founder"} passed on your request`;
    case "message_received":
      return `${from} sent you a message`;
  }
}

function bodyFor(n: StoredNotification): string | null {
  if (n.kind === "connect_requested" && n.payload.message) {
    return `“${n.payload.message}”`;
  }
  if (n.kind === "message_received" && n.payload.message) {
    return n.payload.message;
  }
  return null;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const sec = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
