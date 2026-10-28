"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import {
  FOUNDER_PLANS,
  INVESTOR_PLANS,
  FOUNDER_PLAN_ORDER,
  INVESTOR_PLAN_ORDER,
  FOUNDER_REVIEW,
  DISCLAIMERS,
  VISIBILITY_CONDITIONS,
  PILOT_DAYS,
  formatPrice,
  type Plan,
  type Cadence,
  type Side,
} from "@/lib/billing/plans";
import { startCheckoutAction, startPilotAction } from "@/app/actions/billing";
import { Reveal } from "@/components/motion/reveal";

export function PricingPage({
  initialSide,
  signedIn,
  displayName,
  currentFounderPlan,
  currentInvestorPlan,
  pilotAvailable,
  paymentsReady,
  contactEmail,
}: {
  initialSide: Side;
  signedIn: boolean;
  displayName: string | null;
  currentFounderPlan: string | null;
  currentInvestorPlan: string | null;
  pilotAvailable: boolean;
  paymentsReady: boolean;
  contactEmail: string;
}) {
  const [side, setSide] = useState<Side>(initialSide);
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const firstName = displayName?.split(" ")[0];

  const plans: Plan[] =
    side === "founder"
      ? FOUNDER_PLAN_ORDER.map((id) => FOUNDER_PLANS[id])
      : INVESTOR_PLAN_ORDER.map((id) => INVESTOR_PLANS[id]);
  const current = side === "founder" ? currentFounderPlan : currentInvestorPlan;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <nav className="sticky top-0 z-20 border-b border-ink/8 bg-paper/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-[16px] font-black tracking-tight text-navy">
            Laelapx<span className="text-blue">.</span>
          </Link>
          <div className="flex items-center gap-4 text-[12px] font-semibold">
            {signedIn ? (
              <>
                <Link href="/billing" className="text-ink-soft hover:text-ink">
                  Billing
                </Link>
                <Link
                  href="/welcome"
                  className="rounded-md bg-navy px-4 py-2 text-white transition-colors hover:bg-blue"
                >
                  {firstName ? `Back, ${firstName}` : "Open app"} →
                </Link>
              </>
            ) : (
              <>
                <Link href="/handler/sign-in" className="text-ink-soft hover:text-ink">
                  Sign in
                </Link>
                <Link
                  href="/handler/sign-up"
                  className="rounded-md bg-navy px-4 py-2 text-white transition-colors hover:bg-blue"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <header className="border-b border-ink/8 bg-paper-2 px-6 py-16 text-center">
        <Reveal>
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
            Pricing
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mx-auto max-w-3xl text-[clamp(36px,5vw,64px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-navy">
            Pay for depth. Never for a score.
          </h1>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-ink-soft">
            Paid plans unlock deeper feedback and better tooling. They do not
            change your fundability score, your investor-fit score, or who sees
            what.
          </p>
        </Reveal>

        {/* Side switch */}
        <Reveal delay={0.18}>
          <div className="mt-9 inline-flex rounded-full border border-ink/10 bg-white p-1">
            {(["founder", "investor"] as Side[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={clsx(
                  "relative rounded-full px-5 py-2 text-[13px] font-bold transition-colors",
                  side === s ? "text-white" : "text-ink-soft hover:text-ink"
                )}
              >
                {side === s && (
                  <motion.span
                    layoutId="side-pill"
                    className="absolute inset-0 rounded-full bg-navy"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">
                  {s === "founder" ? "For founders" : "For investors"}
                </span>
              </button>
            ))}
          </div>
        </Reveal>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-14">
        {side === "founder" && (
          <div className="mb-8 flex items-center justify-center gap-3 text-[13px]">
            <span className={clsx("font-semibold", cadence === "monthly" ? "text-ink" : "text-ink-faint")}>
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={cadence === "annual"}
              onClick={() => setCadence(cadence === "monthly" ? "annual" : "monthly")}
              className={clsx(
                "relative h-6 w-11 rounded-full transition-colors",
                cadence === "annual" ? "bg-navy" : "bg-ink/20"
              )}
            >
              <span
                className={clsx(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                  cadence === "annual" ? "left-[22px]" : "left-0.5"
                )}
              />
            </button>
            <span className={clsx("font-semibold", cadence === "annual" ? "text-ink" : "text-ink-faint")}>
              Annual
            </span>
            <span className="rounded-full bg-flag-green/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-flag-green">
              2+ months free
            </span>
          </div>
        )}

        {!paymentsReady && signedIn && (
          <div className="mb-8 rounded-xl border border-flag-amber/30 bg-flag-amber/10 px-5 py-3 text-center text-[13px] text-ink">
            Payments aren&apos;t connected in this environment yet. Plans are shown
            for review; checkout is disabled.
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={side}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={clsx(
              "grid gap-4",
              side === "founder"
                ? "grid-cols-1 md:grid-cols-3"
                : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
            )}
          >
            {plans.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                cadence={cadence}
                isCurrent={current === plan.id}
                hasAnyPlan={current !== null && current !== "free"}
                signedIn={signedIn}
                paymentsReady={paymentsReady}
                pilotAvailable={pilotAvailable}
                contactEmail={contactEmail}
                delay={i * 0.05}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {side === "founder" && (
          <Reveal delay={0.1}>
            <section className="mt-6 flex flex-col gap-5 rounded-2xl border border-ink/10 bg-navy p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-9">
              <div className="max-w-xl">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-blue-light">
                  One-time · {formatPrice(FOUNDER_REVIEW.priceCents)}
                </div>
                <h2 className="text-[24px] font-extrabold tracking-tight">
                  {FOUNDER_REVIEW.name}
                </h2>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-white/75">
                  {FOUNDER_REVIEW.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-blue-light" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={signedIn ? "/billing?side=founder#review" : "/handler/sign-in"}
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-md bg-white px-5 py-2.5 text-[13px] font-bold text-navy transition-colors hover:bg-blue-light hover:text-white"
              >
                {signedIn ? "Order a review" : "Sign in to order"} →
              </Link>
            </section>
          </Reveal>
        )}

        {side === "founder" && (
          <Reveal delay={0.12}>
            <aside className="mt-10 rounded-xl border border-ink/10 bg-white p-6">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
                * Optional visibility to relevant investors — when
              </div>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {VISIBILITY_CONDITIONS.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-[13px] leading-[1.55] text-ink-soft">
                    <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-blue" />
                    {c}
                  </li>
                ))}
              </ul>
            </aside>
          </Reveal>
        )}

        <Reveal delay={0.15}>
          <footer className="mt-14 border-t border-ink/8 pt-8">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
              The fine print, in plain language
            </div>
            <ul className="space-y-2">
              {DISCLAIMERS.map((d) => (
                <li key={d} className="text-[12px] italic leading-[1.6] text-ink-soft">
                  {d}
                </li>
              ))}
            </ul>
          </footer>
        </Reveal>
      </main>
    </div>
  );
}

/* ─── CARD ───────────────────────────────────────────────────────────── */

function PlanCard({
  plan,
  cadence,
  isCurrent,
  hasAnyPlan,
  signedIn,
  paymentsReady,
  pilotAvailable,
  contactEmail,
  delay,
}: {
  plan: Plan;
  cadence: Cadence;
  isCurrent: boolean;
  hasAnyPlan: boolean;
  signedIn: boolean;
  paymentsReady: boolean;
  pilotAvailable: boolean;
  contactEmail: string;
  delay: number;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const effectiveCadence: Cadence =
    plan.price.annual !== null && cadence === "annual" ? "annual" : "monthly";
  const cents = plan.price[effectiveCadence];
  const isFree = (plan.price.monthly ?? 0) === 0;
  const isPilot = !!plan.trialDays;

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    start(async () => {
      try {
        await fn();
      } catch (e) {
        // Next's redirect() throws; let it through.
        if (e && typeof e === "object" && "digest" in e) throw e;
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  };

  let cta: React.ReactNode;
  if (isCurrent) {
    cta = <Disabled>Current plan</Disabled>;
  } else if (plan.contactOnly) {
    cta = (
      <a
        href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Laelapx ${plan.name} plan`)}`}
        className="block rounded-md border border-navy px-4 py-2.5 text-center text-[13px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
      >
        Contact us
      </a>
    );
  } else if (!signedIn) {
    cta = (
      <Link
        href="/handler/sign-up"
        className="block rounded-md bg-navy px-4 py-2.5 text-center text-[13px] font-bold text-white transition-colors hover:bg-blue"
      >
        {isFree ? "Start free" : `Get ${plan.name}`}
      </Link>
    );
  } else if (isPilot) {
    cta = pilotAvailable ? (
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => startPilotAction())}
        className="block w-full rounded-md bg-navy px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-blue disabled:opacity-60"
      >
        {pending ? "Starting…" : `Start ${PILOT_DAYS}-day pilot`}
      </button>
    ) : (
      <Disabled>Pilot used</Disabled>
    );
  } else if (isFree) {
    cta = <Disabled>Included</Disabled>;
  } else if (hasAnyPlan) {
    cta = (
      <Link
        href="/billing"
        className="block rounded-md border border-navy px-4 py-2.5 text-center text-[13px] font-bold text-navy transition-colors hover:bg-navy hover:text-white"
      >
        Switch in billing
      </Link>
    );
  } else {
    cta = (
      <button
        type="button"
        disabled={pending || !paymentsReady}
        onClick={() => run(() => startCheckoutAction(plan.side, plan.id, effectiveCadence))}
        className="block w-full rounded-md bg-navy px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-blue disabled:opacity-60"
      >
        {pending ? "Opening checkout…" : `Get ${plan.name}`}
      </button>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(
        "relative flex flex-col rounded-2xl border bg-white p-6",
        plan.recommended ? "border-blue shadow-[0_8px_32px_rgba(44,91,168,0.12)]" : "border-ink/10"
      )}
    >
      {plan.recommended && (
        <span className="absolute -top-3 left-6 rounded-full bg-blue px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
          Most chosen
        </span>
      )}
      {isCurrent && (
        <span className="absolute -top-3 right-6 rounded-full bg-flag-green px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
          Yours
        </span>
      )}

      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
        {plan.audience}
      </div>
      <h2 className="mt-1 text-[22px] font-extrabold tracking-tight text-navy">
        {plan.name}
      </h2>
      <p className="mt-1 min-h-[40px] text-[13px] leading-[1.5] text-ink-soft">
        {plan.tagline}
      </p>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-[34px] font-extrabold leading-none tracking-[-0.03em] text-navy">
          {plan.contactOnly ? `${formatPrice(cents)}+` : formatPrice(cents)}
        </span>
        {!isFree && !isPilot && (
          <span className="text-[13px] text-ink-faint">
            /{effectiveCadence === "annual" ? "year" : "month"}
          </span>
        )}
        {isPilot && <span className="text-[13px] text-ink-faint">for {plan.trialDays} days</span>}
      </div>
      {effectiveCadence === "annual" && plan.price.monthly && (
        <div className="mt-1 text-[12px] text-ink-faint">
          vs {formatPrice(plan.price.monthly)}/month billed monthly
        </div>
      )}

      <ul className="mt-6 flex-1 space-y-2.5">
        {plan.highlights.map((h) => (
          <li key={h} className="flex items-start gap-2.5 text-[13px] leading-[1.5] text-ink">
            <span className="mt-[3px] grid h-4 w-4 flex-shrink-0 place-items-center rounded-full bg-flag-green/15 text-[9px] font-bold text-flag-green">
              ✓
            </span>
            {h}
          </li>
        ))}
      </ul>

      <div className="mt-7">{cta}</div>
      {error && <p className="mt-2 text-[12px] text-flag-red">{error}</p>}
    </motion.article>
  );
}

function Disabled({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-ink/10 bg-paper-2 px-4 py-2.5 text-center text-[13px] font-bold text-ink-faint">
      {children}
    </div>
  );
}
