"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { Reveal } from "@/components/motion/reveal";
import { FounderTopNav } from "@/components/founder/founder-top-nav";
import { LockedSection } from "@/components/billing/locked-section";
import { sendSupportMessageAction } from "@/app/actions/founder-tools";

type Msg = { id: string; fromTeam: boolean; body: string; createdAt: string };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function SupportView({
  firstName,
  profileImageUrl,
  planBadge,
  allowed,
  messages,
}: {
  firstName: string;
  profileImageUrl: string | null;
  planBadge: { name: string; tone: "neutral" | "paid" | "warn" };
  allowed: boolean;
  messages: Msg[];
}) {
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <FounderTopNav breadcrumb="Support" firstName={firstName} profileImageUrl={profileImageUrl} planBadge={planBadge} active="support" />

      <header className="border-b border-ink/8 bg-paper-2 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">Async support</div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="text-[clamp(30px,4vw,46px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-navy">
              Ask the Laelapx team anything.
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
              Your deck, your raise, your score, an investor conversation — write here and a person on the team
              replies, usually within one business day. You&apos;ll get an email when we do.
            </p>
          </Reveal>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {!allowed ? (
          <LockedSection
            eyebrow="Async support"
            title="A direct line to the people who built the rubric."
            blurb="Laelapx+ includes ongoing async support: send questions about your deck, score, or fundraise and get a written answer from the team."
            planName="Laelapx+"
          />
        ) : (
          <section className="rounded-2xl border border-ink/10 bg-white">
            <div className="max-h-[60vh] space-y-4 overflow-y-auto p-6">
              {messages.length === 0 ? (
                <p className="py-10 text-center text-[13px] text-ink-faint">
                  No messages yet. Start with whatever is on your mind.
                </p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={clsx("flex", m.fromTeam ? "justify-start" : "justify-end")}>
                    <div
                      className={clsx(
                        "max-w-[80%] rounded-2xl px-4 py-3",
                        m.fromTeam ? "rounded-bl-md bg-paper-2 text-ink" : "rounded-br-md bg-navy text-white"
                      )}
                    >
                      <div className={clsx("mb-1 text-[10px] font-bold uppercase tracking-[0.15em]", m.fromTeam ? "text-blue" : "text-white/55")}>
                        {m.fromTeam ? "Laelapx team" : "You"} · {fmt(m.createdAt)}
                      </div>
                      <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{m.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form
              className="border-t border-ink/8 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                setErr(null);
                start(async () => {
                  const r = await sendSupportMessageAction(body);
                  if (r.ok) setBody("");
                  else setErr(r.error);
                });
              }}
            >
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                maxLength={5000}
                placeholder="Write to the team…"
                className="w-full rounded-md border border-ink/10 bg-paper px-4 py-3 text-[14px] outline-none focus:border-blue focus:ring-4 focus:ring-blue/15"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[12px] text-flag-red">{err}</span>
                <button
                  type="submit"
                  disabled={pending || !body.trim()}
                  className="rounded-md bg-navy px-5 py-2.5 text-[13px] font-bold text-white hover:bg-blue disabled:opacity-60"
                >
                  {pending ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
