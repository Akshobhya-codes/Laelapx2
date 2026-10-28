import "server-only";
import { shell, escapeHtml } from "./templates";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://app.laelapx.com"
    : "http://localhost:3000");

const p = (html: string) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#191714;">${html}</p>`;
const h = (text: string) =>
  `<h1 style="margin:0 0 18px;font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#1c2b42;">${text}</h1>`;
const muted = (html: string) =>
  `<p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#9a968e;">${html}</p>`;

/* ─── SUBSCRIPTIONS ──────────────────────────────────────────────────── */

export function subscriptionStartedEmail(input: {
  firstName: string;
  planName: string;
  side: "founder" | "investor";
}) {
  const where = input.side === "founder" ? "/founder" : "/funder";
  return {
    subject: `${input.planName} is active`,
    html: shell({
      preheader: `Your ${input.planName} plan is live.`,
      bodyHtml:
        h(`${escapeHtml(input.planName)} is active.`) +
        p(`Hi ${escapeHtml(input.firstName)} — thanks. Everything in ${escapeHtml(input.planName)} is unlocked now.`) +
        p(`You can change or cancel the plan any time from your billing page.`) +
        muted(
          "Payment improves the depth of feedback and product features. It does not guarantee investor exposure, meetings, introductions, funding, or favorable scoring."
        ),
      ctaLabel: "Open Laelapx",
      ctaHref: `${APP_URL}${where}`,
    }),
  };
}

/* ─── TEAM INVITES ───────────────────────────────────────────────────── */

export function teamInviteEmail(input: {
  inviterName: string;
  teamName: string;
  planName: string;
}) {
  return {
    subject: `${input.inviterName} added you to ${input.teamName} on Laelapx`,
    html: shell({
      preheader: `You have a seat on ${input.teamName}'s ${input.planName} plan.`,
      bodyHtml:
        h(`You're on ${escapeHtml(input.teamName)}.`) +
        p(
          `${escapeHtml(input.inviterName)} gave you a seat on their ${escapeHtml(
            input.planName
          )} plan. Sign in with this email address and you'll share the team's deal flow, notes, and pipeline.`
        ) +
        p(`If you don't have an account yet, signing up with this address is enough — the seat attaches automatically.`),
      ctaLabel: "Sign in",
      ctaHref: `${APP_URL}/handler/sign-in`,
    }),
  };
}

/* ─── FOUNDER REVIEW ─────────────────────────────────────────────────── */

export function reviewOrderReceiptEmail(input: {
  founderFirstName: string;
  wantsCall: boolean;
  turnaroundDays: number;
}) {
  return {
    subject: "Founder Review — we've got your deck",
    html: shell({
      preheader: `Your written memo is on its way.`,
      bodyHtml:
        h("Your Founder Review is in the queue.") +
        p(`Hi ${escapeHtml(input.founderFirstName)} — payment went through and a reviewer will pick this up shortly.`) +
        p(
          `You'll get a written memo and a fundraising-readiness plan within ${input.turnaroundDays} business days.` +
            (input.wantsCall
              ? " You asked for a call — we'll send a scheduling link with the memo."
              : "")
        ) +
        muted(
          "A review improves the depth of feedback. It does not guarantee investor exposure, introductions, funding, or a change to your fundability score."
        ),
      ctaLabel: "Track status",
      ctaHref: `${APP_URL}/billing?side=founder`,
    }),
  };
}

export function reviewOrderAdminEmail(input: {
  founderName: string;
  founderEmail: string | null;
  companyName: string | null;
  deckUrl: string | null;
  wantsCall: boolean;
  notes: string | null;
  orderId: string;
}) {
  const rows = [
    ["Founder", escapeHtml(input.founderName)],
    ["Email", input.founderEmail ? escapeHtml(input.founderEmail) : "—"],
    ["Company", input.companyName ? escapeHtml(input.companyName) : "— (no submission attached)"],
    [
      "Deck",
      input.deckUrl
        ? `<a href="${escapeHtml(input.deckUrl)}" style="color:#2c5ba8;">${escapeHtml(input.deckUrl)}</a>`
        : "not provided — ask the founder",
    ],
    ["Wants a call", input.wantsCall ? "Yes" : "No"],
    ["Notes", input.notes ? escapeHtml(input.notes) : "—"],
  ]
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 10px 6px 0;font-size:12px;font-weight:700;color:#9a968e;text-transform:uppercase;letter-spacing:0.1em;vertical-align:top;">${k}</td><td style="padding:6px 0;font-size:14px;color:#191714;">${v}</td></tr>`
    )
    .join("");

  return {
    subject: `New Founder Review order — ${input.companyName ?? input.founderName}`,
    html: shell({
      preheader: `$499 paid. Deck review needed.`,
      bodyHtml:
        h("New Founder Review order") +
        p("A founder just paid for a review. Details:") +
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">${rows}</table>`,
      ctaLabel: "Open the review queue",
      ctaHref: `${APP_URL}/admin#order-${input.orderId}`,
    }),
  };
}

export function reviewDeliveredEmail(input: {
  founderFirstName: string;
  memoUrl: string | null;
}) {
  return {
    subject: "Your Founder Review is ready",
    html: shell({
      preheader: "The memo and readiness plan are on your billing page.",
      bodyHtml:
        h("Your review is ready.") +
        p(`Hi ${escapeHtml(input.founderFirstName)} — the written memo and your fundraising-readiness plan are done.`) +
        p(
          input.memoUrl
            ? `You can open the memo directly, or read it alongside your dashboard.`
            : `Read it on your billing page, alongside your dashboard.`
        ),
      ctaLabel: input.memoUrl ? "Open the memo" : "Read the review",
      ctaHref: input.memoUrl ?? `${APP_URL}/billing?side=founder`,
    }),
  };
}
