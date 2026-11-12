"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Reveal } from "@/components/motion/reveal";
import { FounderTopNav } from "@/components/founder/founder-top-nav";
import { rsvpAction } from "@/app/actions/founder-tools";

export type EventCard = {
  id: string;
  title: string;
  description: string | null;
  kind: "education" | "workshop" | "community" | "in_person";
  startsAt: string;
  durationMin: number;
  location: string | null;
  joinUrl: string | null;
  spotsLeft: number | null;
  going: boolean;
  eligible: boolean;
  requiredPlan: string;
};

const KIND_LABEL: Record<EventCard["kind"], string> = {
  education: "Education session",
  workshop: "Pitch-readiness workshop",
  community: "Community event",
  in_person: "In person",
};

export function EventsView({
  firstName,
  profileImageUrl,
  planBadge,
  events,
  isPaid,
}: {
  firstName: string;
  profileImageUrl: string | null;
  planBadge: { name: string; tone: "neutral" | "paid" | "warn" };
  events: EventCard[];
  isPaid: boolean;
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <FounderTopNav breadcrumb="Events" firstName={firstName} profileImageUrl={profileImageUrl} planBadge={planBadge} active="events" />

      <header className="border-b border-ink/8 bg-paper-2 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">Events</div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="text-[clamp(32px,4vw,52px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-navy">
              Sessions, workshops, and rooms worth being in.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
              Education sessions, pitch-readiness workshops, and community events come with Founder+.
              In-person invitations come with Laelapx+.
              {!isPaid && (
                <>
                  {" "}
                  <Link href="/pricing" className="font-semibold text-blue hover:underline">See plans →</Link>
                </>
              )}
            </p>
          </Reveal>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {events.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-white p-14 text-center">
            <div className="text-[15px] font-semibold text-ink">No upcoming events yet.</div>
            <p className="mt-2 text-[13px] text-ink-soft">New sessions are announced here and in your notifications.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {events.map((e, i) => (
              <Reveal key={e.id} delay={Math.min(i * 0.04, 0.3)}>
                <EventRow event={e} />
              </Reveal>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function EventRow({ event: e }: { event: EventCard }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const when = new Date(e.startsAt);
  const full = e.spotsLeft === 0 && !e.going;

  const toggle = (going: boolean) => {
    setErr(null);
    start(async () => {
      const r = await rsvpAction(e.id, going);
      if (!r.ok) setErr(r.error);
    });
  };

  return (
    <li className={clsx("flex flex-col gap-5 rounded-2xl border bg-white p-6 sm:flex-row", e.going ? "border-blue/40" : "border-ink/10")}>
      <div className="flex w-20 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-paper-2 py-3 text-center">
        <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue">
          {when.toLocaleDateString("en-US", { month: "short" })}
        </div>
        <div className="text-[28px] font-extrabold leading-none text-navy">{when.getDate()}</div>
        <div className="mt-1 text-[11px] text-ink-faint">{when.toLocaleDateString("en-US", { weekday: "short" })}</div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={clsx(
              "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
              e.kind === "in_person" ? "bg-navy text-white" : "bg-blue/10 text-blue"
            )}
          >
            {KIND_LABEL[e.kind]}
          </span>
          <span className="text-[12px] text-ink-faint">
            {when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {e.durationMin} min
            {e.location ? ` · ${e.location}` : ""}
          </span>
        </div>
        <h3 className="mt-2 text-[19px] font-extrabold tracking-tight text-navy">{e.title}</h3>
        {e.description && <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">{e.description}</p>}
        {e.going && e.joinUrl && (
          <a
            href={e.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-[13px] font-bold text-blue hover:underline"
          >
            Join link →
          </a>
        )}
        {err && <p className="mt-2 text-[12px] text-flag-red">{err}</p>}
      </div>

      <div className="flex flex-shrink-0 flex-col items-end justify-center gap-2">
        {!e.eligible ? (
          <Link
            href="/pricing"
            className="rounded-md border border-dashed border-ink/20 px-4 py-2 text-[12px] font-bold text-ink-soft hover:border-blue/40"
          >
            🔒 Included in {e.requiredPlan}
          </Link>
        ) : e.going ? (
          <>
            <span className="rounded-full bg-flag-green/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-flag-green">
              You&apos;re going
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => toggle(false)}
              className="text-[12px] font-semibold text-ink-faint hover:text-flag-red"
            >
              Can&apos;t make it
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending || full}
            onClick={() => toggle(true)}
            className="rounded-md bg-navy px-5 py-2.5 text-[13px] font-bold text-white hover:bg-blue disabled:opacity-60"
          >
            {full ? "Full" : pending ? "Saving…" : "RSVP"}
          </button>
        )}
        {e.spotsLeft !== null && e.eligible && !full && (
          <span className="text-[11px] text-ink-faint">{e.spotsLeft} spot{e.spotsLeft === 1 ? "" : "s"} left</span>
        )}
      </div>
    </li>
  );
}
