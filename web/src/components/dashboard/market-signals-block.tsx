import { getMarketSignals } from "@/lib/market-signals/match";
import type { StoredSubmission } from "@/lib/insforge/submissions";
import { MarketSignalsSection } from "./market-signals-section";

/**
 * Server-side wrapper. Fetches live SERP-backed market signals against the
 * founder's stage + sectors and renders the section. Fails soft — any error
 * renders nothing instead of crashing the dashboard.
 */
export async function MarketSignalsBlock({
  submission,
}: {
  submission: StoredSubmission;
}) {
  let signals;
  try {
    signals = await getMarketSignals(submission);
  } catch {
    return null;
  }
  return <MarketSignalsSection signals={signals} />;
}
