"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Reveal } from "@/components/motion/reveal";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { LogoSpinner } from "@/components/motion/logo-spinner";
import type { ExternalFundMatch } from "@/lib/external-funds/types";
import {
  recordSelfApplicationAction,
  requestConciergeApplicationAction,
} from "@/app/actions/fund-applications";

export type FundApplicationState = {
  domain: string;
  /** The team's application, once paid for. */
  concierge: "paid" | "in_progress" | "submitted" | "canceled" | null;
  selfApplied: boolean;
};

type Pricing = { applicationCents: number; kickoffCents: number | null };

const dollars = (c: number) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;

export function ExternalFundsSection({
  items,
  slug,
  applicationCents,
  kickoffCents,
}: {
  items: { match: ExternalFundMatch; state: FundApplicationState | null }[];
  slug: string;
  applicationCents: number;
  /** null once the founder's kickoff call has been paid for. */
  kickoffCents: number | null;
}) {
  if (items.length === 0) return null;
  const pricing: Pricing = { applicationCents, kickoffCents };

  return (
    <section className="mt-20">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
              04 — VCs across the web
            </div>
            <h2 className="text-[clamp(28px,3.4vw,40px)] font-extrabold leading-[1.05] tracking-[-0.02em] text-navy">
              VCs anywhere whose thesis fits yours.
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-soft">
              We searched the web for funds matching your stage and sectors and
              ranked them by fit. These funds aren&apos;t on Laelapx. Apply
              through each fund&apos;s own form yourself, or have our team apply
              for you.
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-6 rounded-xl border border-blue/20 bg-blue/[0.04] p-5 text-[13px] leading-relaxed text-ink-soft">
          <span className="font-bold text-navy">Have Laelapx apply for you — {dollars(applicationCents)} per fund.</span>{" "}
          Our team writes and submits the application using the same 33-page
          evaluation rubric behind your score and our experience on the investor
          side of the table, so it reads the way investors decide.
          {kickoffCents ? (
            <> Your first request includes a one-time {dollars(kickoffCents)} kickoff call where we learn your company inside out.</>
          ) : null}
        </div>
      </Reveal>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map(({ match, state }, i) => (
          <Reveal key={`${match.fund.fundName}-${i}`} delay={i * 0.05}>
            <ExternalFundCard match={match} state={state} slug={slug} pricing={pricing} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const CONCIERGE_LABEL: Record<NonNullable<FundApplicationState["concierge"]>, string> = {
  paid: "Laelapx applying · queued",
  in_progress: "Laelapx applying · in progress",
  submitted: "Submitted by Laelapx ✓",
  canceled: "Application canceled",
};

function ApplyActions({
  match,
  state,
  slug,
  pricing,
  sourceHost,
}: {
  match: ExternalFundMatch;
  state: FundApplicationState | null;
  slug: string;
  pricing: Pricing;
  sourceHost: string;
}) {
  const { fund } = match;
  const href = fund.applyUrl || fund.websiteUrl;
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [selfApplied, setSelfApplied] = useState(state?.selfApplied ?? false);

  if (state?.concierge && state.concierge !== "canceled") {
    return (
      <div className="rounded-md border border-flag-green/30 bg-flag-green/[0.06] px-3 py-2 text-[12px] font-bold text-flag-green">
        {CONCIERGE_LABEL[state.concierge]}
      </div>
    );
  }

  const total = pricing.applicationCents + (pricing.kickoffCents ?? 0);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          onClick={() => {
            // Opening the link is the application; logging it is best-effort.
            if (!state || selfApplied) return;
            setSelfApplied(true);
            recordSelfApplicationAction(slug, state.domain).catch(() => {});
          }}
          className="inline-flex items-center gap-1 rounded-md border border-ink/15 bg-white px-3 py-2 text-[12px] font-bold text-ink transition-colors hover:border-blue/40 hover:text-blue"
        >
          {selfApplied ? "Applied ✓ · open again ↗" : `Apply yourself at ${sourceHost} ↗`}
        </a>
        {state && !open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-md bg-navy px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-blue"
          >
            Have Laelapx apply · {dollars(pricing.applicationCents)}
          </button>
        ) : null}
      </div>
      {state && open ? (
        <form
          className="mt-1 rounded-lg border border-ink/10 bg-white p-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              try {
                await requestConciergeApplicationAction({ slug, domain: state.domain, notes });
              } catch (err) {
                // redirect() to Stripe surfaces as a thrown error with a digest; let it through.
                if (err && typeof err === "object" && "digest" in err) throw err;
                setError(err instanceof Error ? err.message : "Something went wrong.");
              }
            });
          }}
        >
          <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">
            Anything we should know for {fund.fundName}?
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Optional: a warm angle, a partner you'd like us to address, timing…"
            className="mt-2 w-full rounded-md border border-ink/15 p-2 text-[13px] text-ink outline-none focus:border-blue"
          />
          <div className="mt-2 text-[12px] text-ink-soft">
            {pricing.kickoffCents
              ? `${dollars(pricing.applicationCents)} application + ${dollars(pricing.kickoffCents)} one-time kickoff call = ${dollars(total)}`
              : `${dollars(pricing.applicationCents)} for this application`}
          </div>
          {error ? <div className="mt-2 text-[12px] font-semibold text-flag-red">{error}</div> : null}
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-navy px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-blue disabled:opacity-60"
            >
              {pending ? "Opening checkout…" : `Continue to payment · ${dollars(total)}`}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-[12px] font-bold text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function ExternalFundCard({
  match,
  state,
  slug,
  pricing,
}: {
  match: ExternalFundMatch;
  state: FundApplicationState | null;
  slug: string;
  pricing: Pricing;
}) {
  const { fund, fitScore, reasons } = match;
  const partnerLine = [fund.partnerName, fund.partnerTitle]
    .filter(Boolean)
    .join(" · ");
  const sourceHost = (() => {
    try {
      return new URL(fund.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex h-full flex-col rounded-xl border border-dashed border-ink/15 bg-paper-2/40 p-6"
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="text-[16px] font-extrabold tracking-tight text-navy">
            {fund.fundName}
          </div>
          {partnerLine && (
            <div className="text-[12px] text-ink-faint">{partnerLine}</div>
          )}
        </div>
        <FitBadge value={fitScore} />
      </div>

      <p className="mb-4 text-[13px] italic leading-[1.55] text-ink-soft">
        “{fund.thesisOneLiner}”
      </p>

      {reasons.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {reasons.map((r, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12px] leading-[1.55] text-ink-soft"
            >
              <span className="mt-[5px] h-1 w-1 flex-shrink-0 rounded-full bg-blue" />
              {r}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink/8 pt-4 text-[10px] uppercase tracking-[0.15em]">
        {fund.hq && <span className="text-ink-faint">{fund.hq}</span>}
        {fund.hq && fund.stages.length > 0 && (
          <span className="text-ink-faint">·</span>
        )}
        {fund.stages.length > 0 && (
          <span className="text-ink-faint">{fund.stages.join(" / ")}</span>
        )}
      </div>

      <div className="mt-3">
        <ApplyActions match={match} state={state} slug={slug} pricing={pricing} sourceHost={sourceHost} />
      </div>

      <div className="mt-3 text-[10px] uppercase tracking-[0.15em] text-ink-faint">
        Public info · not affiliated with Laelapx
      </div>
    </motion.div>
  );
}

function FitBadge({ value }: { value: number }) {
  const tone =
    value >= 85
      ? "border-flag-green/30 bg-flag-green/8 text-flag-green"
      : value >= 65
      ? "border-blue/30 bg-blue/8 text-blue"
      : "border-ink/10 bg-paper text-ink-faint";
  return (
    <div
      className={`flex flex-col items-end rounded-md border px-2.5 py-1 ${tone}`}
    >
      <span className="text-[15px] font-extrabold leading-none tabular-nums">
        <AnimatedNumber value={value} />
        <span className="text-[10px] font-bold opacity-70">%</span>
      </span>
      <span className="text-[8px] font-bold uppercase tracking-[0.15em] opacity-75">
        Fit
      </span>
    </div>
  );
}

export function ExternalFundsSkeleton() {
  return (
    <section className="mt-20">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
        04 — VCs across the web
      </div>
      <div className="rounded-2xl border border-dashed border-ink/15 bg-paper-2/40 px-6 py-16">
        <LogoSpinner size={64} label="Scraping the web for matching funds…" />
      </div>
    </section>
  );
}
