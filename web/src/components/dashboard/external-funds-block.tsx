import { matchExternalFunds } from "@/lib/external-funds/match";
import { fundDomain } from "@/lib/external-funds/discover";
import type { StoredSubmission } from "@/lib/insforge/submissions";
import {
  getKickoff,
  kickoffIsPaid,
  listApplicationsForSubmission,
  upsertExternalFunds,
} from "@/lib/insforge/fund-network";
import { CONCIERGE } from "@/lib/billing/plans";
import { ExternalFundsSection, type FundApplicationState } from "./external-funds-section";

/**
 * Server-side wrapper that triggers the (cached, web-scraping) match pipeline
 * and renders the section, with each fund's application state. Fails soft —
 * any error renders nothing rather than crashing the dashboard.
 */
export async function ExternalFundsBlock({
  submission,
}: {
  submission: StoredSubmission;
}) {
  let props: React.ComponentProps<typeof ExternalFundsSection>;
  try {
    const matches = await matchExternalFunds(submission, { top: 6 });
    if (matches.length === 0) return null;
    // Funds cached before the network table existed still need a row to be
    // applied to; upserting is idempotent.
    await upsertExternalFunds(matches.map((m) => m.fund));
    const [apps, kickoff] = await Promise.all([
      listApplicationsForSubmission(submission.id),
      getKickoff(submission.ownerUserId),
    ]);

    const items = matches.map((match) => {
      const domain = fundDomain(match.fund);
      const mine = domain ? apps.filter((a) => a.fundDomain === domain) : [];
      const concierge = mine.find((a) => a.mode === "concierge" && a.status !== "awaiting_payment");
      const state: FundApplicationState | null = domain
        ? {
            domain,
            concierge: concierge ? (concierge.status as FundApplicationState["concierge"]) : null,
            selfApplied: mine.some((a) => a.mode === "self"),
          }
        : null;
      return { match, state };
    });

    props = {
      items,
      slug: submission.slug,
      applicationCents: CONCIERGE.applicationCents,
      kickoffCents: kickoffIsPaid(kickoff) ? null : CONCIERGE.kickoffCents,
    };
  } catch {
    return null;
  }
  return <ExternalFundsSection {...props} />;
}
