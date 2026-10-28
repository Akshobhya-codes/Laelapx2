"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import {
  adminReplySupportAction,
  adminMarkThreadReadAction,
  adminCreateEventAction,
  adminDeleteEventAction,
} from "@/app/actions/founder-tools";

/* ─── SUPPORT INBOX ──────────────────────────────────────────────────── */

export type SupportThreadView = {
  threadUserId: string;
  founder: { name: string; email: string | null };
  plan: string;
  unread: number;
  lastAt: string;
  messages: { id: string; fromTeam: boolean; body: string; createdAt: string }[];
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function SupportInbox({
  threads,
  initialThread,
}: {
  threads: SupportThreadView[];
  initialThread: string | null;
}) {
  const [openId, setOpenId] = useState<string | null>(
    initialThread && threads.some((t) => t.threadUserId === initialThread)
      ? initialThread
      : threads[0]?.threadUserId ?? null
  );
  const open = threads.find((t) => t.threadUserId === openId) ?? null;

  if (threads.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-white p-12 text-center text-[13px] text-ink-soft">
        No support messages yet. Laelapx+ founders write in from /support; you&apos;ll get an email for each one.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <ul className="divide-y divide-ink/8 overflow-hidden rounded-xl border border-ink/10 bg-white">
        {threads.map((t) => (
          <li key={t.threadUserId}>
            <button
              type="button"
              onClick={() => {
                setOpenId(t.threadUserId);
                if (t.unread > 0) void adminMarkThreadReadAction(t.threadUserId);
              }}
              className={clsx(
                "block w-full px-4 py-3 text-left transition-colors",
                openId === t.threadUserId ? "bg-blue/[0.06]" : "hover:bg-paper"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[13px] font-bold text-ink">{t.founder.name}</span>
                {t.unread > 0 && (
                  <span className="rounded-full bg-blue px-1.5 py-0.5 text-[10px] font-bold text-white">{t.unread}</span>
                )}
              </div>
              <div className="truncate text-[12px] text-ink-soft">{t.messages[t.messages.length - 1]?.body}</div>
              <div className="mt-0.5 text-[11px] text-ink-faint">{t.plan} · {when(t.lastAt)}</div>
            </button>
          </li>
        ))}
      </ul>
      {open && <ThreadPane key={open.threadUserId} thread={open} />}
    </div>
  );
}

function ThreadPane({ thread }: { thread: SupportThreadView }) {
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="flex flex-col rounded-xl border border-ink/10 bg-white">
      <header className="border-b border-ink/8 px-5 py-3">
        <div className="text-[14px] font-bold text-navy">{thread.founder.name}</div>
        <div className="text-[12px] text-ink-faint">{thread.founder.email ?? "no email"} · {thread.plan}</div>
      </header>
      <div className="max-h-[50vh] flex-1 space-y-3 overflow-y-auto p-5">
        {thread.messages.map((m) => (
          <div key={m.id} className={clsx("flex", m.fromTeam ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[80%] rounded-2xl px-4 py-2.5",
                m.fromTeam ? "rounded-br-md bg-navy text-white" : "rounded-bl-md bg-paper-2 text-ink"
              )}
            >
              <div className={clsx("mb-0.5 text-[10px] font-bold uppercase tracking-[0.12em]", m.fromTeam ? "text-white/55" : "text-blue")}>
                {m.fromTeam ? "Team" : "Founder"} · {when(m.createdAt)}
              </div>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{m.body}</p>
            </div>
          </div>
        ))}
      </div>
      <form
        className="border-t border-ink/8 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErr(null);
          start(async () => {
            const r = await adminReplySupportAction(thread.threadUserId, body);
            if (r.ok) setBody("");
            else setErr(r.error);
          });
        }}
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Reply as the Laelapx team — the founder gets an email."
          className="w-full rounded-md border border-ink/10 bg-paper px-4 py-2.5 text-[13px] outline-none focus:border-blue"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[12px] text-flag-red">{err}</span>
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="rounded-md bg-navy px-4 py-2 text-[12px] font-bold text-white hover:bg-blue disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send reply"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ─── EVENTS MANAGER ─────────────────────────────────────────────────── */

export type AdminEventView = {
  id: string;
  title: string;
  kind: "education" | "workshop" | "community" | "in_person";
  startsAt: string;
  location: string | null;
  capacity: number | null;
  attendees: { name: string; email: string | null }[];
  /** Decided on the server at request time, not during render. */
  past: boolean;
};

const KINDS: { id: AdminEventView["kind"]; label: string; plan: string }[] = [
  { id: "education", label: "Education session", plan: "Founder+" },
  { id: "workshop", label: "Pitch-readiness workshop", plan: "Founder+" },
  { id: "community", label: "Community event", plan: "Founder+" },
  { id: "in_person", label: "In-person event", plan: "Laelapx+" },
];

export function EventsManager({ events }: { events: AdminEventView[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<AdminEventView["kind"]>("workshop");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [location, setLocation] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [capacity, setCapacity] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);

  const input = "w-full rounded-md border border-ink/10 bg-paper px-3 py-2 text-[13px] outline-none focus:border-blue";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section>
        {events.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-white p-12 text-center text-[13px] text-ink-soft">
            No events yet. Create one and it appears on every founder&apos;s /events page.
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => {
              return (
                <li key={e.id} className={clsx("rounded-xl border border-ink/10 bg-white p-4", e.past && "opacity-60")}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-[14px] font-bold text-navy">{e.title}</div>
                      <div className="text-[12px] text-ink-faint">
                        {new Date(e.startsAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        {" · "}{KINDS.find((k) => k.id === e.kind)?.label}
                        {e.location ? ` · ${e.location}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setOpenId(openId === e.id ? null : e.id)}
                        className="text-[12px] font-semibold text-blue hover:underline"
                      >
                        {e.attendees.length}{e.capacity ? ` / ${e.capacity}` : ""} going
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm(`Delete "${e.title}"? RSVPs are removed too.`)) return;
                          start(async () => { await adminDeleteEventAction(e.id); });
                        }}
                        className="text-[12px] font-semibold text-ink-faint hover:text-flag-red"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {openId === e.id && (
                    <ul className="mt-3 space-y-1 border-t border-ink/8 pt-3 text-[12px]">
                      {e.attendees.length === 0 ? (
                        <li className="text-ink-faint">No RSVPs yet.</li>
                      ) : (
                        e.attendees.map((a, i) => (
                          <li key={i} className="flex justify-between gap-2">
                            <span className="text-ink">{a.name}</span>
                            <span className="text-ink-faint">{a.email ?? "—"}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form
        className="h-fit space-y-3 rounded-2xl border border-ink/10 bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setMsg(null);
          start(async () => {
            const r = await adminCreateEventAction({
              title,
              description,
              kind,
              // datetime-local is the admin's local time; Date parses it as such.
              startsAt: startsAt ? new Date(startsAt).toISOString() : "",
              durationMin: Number(duration) || 60,
              location,
              joinUrl,
              capacity: capacity ? Number(capacity) : null,
            });
            if (r.ok) {
              setMsg({ ok: true, text: "Event published." });
              setTitle(""); setDescription(""); setStartsAt(""); setLocation(""); setJoinUrl(""); setCapacity("");
            } else setMsg({ ok: false, text: r.error });
          });
        }}
      >
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-faint">New event</div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required className={input} />
        <select value={kind} onChange={(e) => setKind(e.target.value as AdminEventView["kind"])} className={input}>
          {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label} — {k.plan}</option>)}
        </select>
        <div className="grid grid-cols-[1fr_90px] gap-2">
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required className={input} />
          <input inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Min" className={input} aria-label="Duration in minutes" />
        </div>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={kind === "in_person" ? "Venue, city" : "Online"} className={input} />
        <input value={joinUrl} onChange={(e) => setJoinUrl(e.target.value)} placeholder="Join / details link (https://…) — shown only to RSVPs" className={input} />
        <input inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Capacity (blank = unlimited)" className={input} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What founders will get out of it" className={input} />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-navy px-4 py-2.5 text-[13px] font-bold text-white hover:bg-blue disabled:opacity-60"
        >
          {pending ? "Publishing…" : "Publish event"}
        </button>
        {msg && <p className={clsx("text-[12px]", msg.ok ? "text-flag-green" : "text-flag-red")}>{msg.text}</p>}
      </form>
    </div>
  );
}
