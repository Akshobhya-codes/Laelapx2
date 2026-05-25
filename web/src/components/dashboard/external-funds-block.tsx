import { matchExternalFunds } from "@/lib/external-funds/match";
import type { StoredSubmission } from "@/lib/insforge/submissions";
import { ExternalFundsSection } from "./external-funds-section";

/**
 * Server-side wrapper that triggers the (cached, web-scraping) match pipeline
 * and renders the section. Fails soft — any error renders nothing rather than
 * crashing the dashboard.
 */
export async function ExternalFundsBlock({
  submission,
}: {
  submission: StoredSubmission;
}) {
  let matches;
  try {
    matches = await matchExternalFunds(submission, { top: 6 });
  } catch {
    return null;
  }
  return <ExternalFundsSection matches={matches} />;
}
