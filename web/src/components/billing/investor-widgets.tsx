"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { pilotFeedbackAction, saveNoteAction } from "@/app/actions/billing";

/**
 * Investor-side widgets that sit on a founder's public page (/s/[slug]).
 *
 * PilotFeedback — "was this match useful?" for pilot accounts. This is the
 * feedback loop the pilot promises, and what /admin reports on.
 *
 * InvestorNote — notes + a light CRM stage, Syndicate and up. Shared across
 * the team because notes are keyed by the account owner.
 */

export function PilotFeedback({
  slug,
  initial,
}: {
  slug: string;
  initial: { useful: boolean; note: string | null } | null;
}) {
  const [useful, setUseful] = useState<boolean | null>(initial?.useful ?? null);
  const [note, setNote] = useState(initial?.note ?? "");
  const [saved, setSaved] = useState(!!initial);
  const [pending, start] = useTransition();

  const send = (u: boolean) => {
    setUseful(u);
    setSaved(false);
    start(async () => {
      await pilotFeedbackAction({ slug, useful: u, note });
      setSaved(true);
    });
  };

  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-5 right-5 z-40 w-[300px] rounded-2xl border border-ink/10 bg-white p-4 shadow-[0_12px_40px_rgba(28,43,66,0.18)]"
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue">Pilot feedback</div>
      <div className="mt-1 text-[14px] font-bold text-navy">Was this match useful?</div>
      <div className="mt-3 flex gap-2">
        {([true, false] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            disabled={pending}
            onClick={() => send(v)}
            className={clsx(
              "flex-1 rounded-md border px-3 py-2 text-[12px] font-bold transition-colors",
              useful === v
                ? v ? "border-flag-green bg-flag-green text-white" : "border-flag-red bg-flag-red text-white"
                : "border-ink/10 bg-paper text-ink-soft hover:border-ink/30"
            )}
          >
            {v ? "Yes" : "No"}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => { setNote(e.target.value); setSaved(false); }}
        onBlur={() => { if (useful !== null) send(useful); }}
        rows={2}
        placeholder="Why? (optional)"
        className="mt-2 w-full rounded-md border border-ink/10 bg-paper px-3 py-2 text-[12px] outline-none focus:border-blue"
      />
      <div className="mt-1 h-4 text-[11px] text-ink-faint">
        {pending ? "Saving…" : saved ? "Saved — thank you." : ""}
      </div>
    </motion.aside>
  );
}

const STAGES = ["New", "Reviewing", "Meeting", "Diligence", "Passed", "Invested"];

export function InvestorNote({
  slug,
  initial,
  teamName,
}: {
  slug: string;
  initial: { body: string; stage: string | null; updatedAt: string } | null;
  teamName: string | null;
}) {
  const [open, setOpen] = useState(!!initial);
  const [body, setBody] = useState(initial?.body ?? "");
  const [stage, setStage] = useState<string | null>(initial?.stage ?? null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-5 left-5 z-40 w-[320px]"
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-ink/10 bg-white px-4 py-2 text-[12px] font-bold text-navy shadow-[0_8px_24px_rgba(28,43,66,0.14)] hover:border-blue"
        >
          ✎ Add a note
        </button>
      ) : (
        <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-[0_12px_40px_rgba(28,43,66,0.18)]">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue">
              {teamName ? `${teamName} notes` : "Your notes"}
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-[12px] text-ink-faint hover:text-ink">✕</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {STAGES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s === stage ? null : s)}
                className={clsx(
                  "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]",
                  stage === s ? "border-navy bg-navy text-white" : "border-ink/10 text-ink-soft hover:border-ink/30"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="What stood out, questions for the founder, next step…"
            className="mt-2 w-full rounded-md border border-ink/10 bg-paper px-3 py-2 text-[12px] outline-none focus:border-blue"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-ink-faint">{msg ?? (initial ? `Saved ${new Date(initial.updatedAt).toLocaleDateString()}` : "")}</span>
            <button
              type="button"
              disabled={pending || !body.trim()}
              onClick={() =>
                start(async () => {
                  const r = await saveNoteAction({ slug, body, stage });
                  setMsg(r.ok ? "Saved" : r.error ?? "Failed");
                })
              }
              className="rounded-md bg-navy px-3 py-1.5 text-[12px] font-bold text-white hover:bg-blue disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
