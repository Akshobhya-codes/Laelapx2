import { stackServerApp } from "@/stack";
import {
  getFounderEntitlement,
  getInvestorEntitlement,
} from "@/lib/billing/entitlements";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { PricingPage } from "./pricing-client";

export const metadata = {
  title: "Pricing · Laelapx",
  description:
    "Plans for founders raising and investors sourcing. Payment improves feedback depth and tooling — never scores or exposure.",
};

export const dynamic = "force-dynamic";

export default async function Pricing({
  searchParams,
}: {
  searchParams: Promise<{ side?: string }>;
}) {
  const sp = await searchParams;
  const user = await stackServerApp.getUser({ or: "return-null" });

  // Default tab: explicit ?side=, else the role they chose at /welcome.
  const role = (user?.clientReadOnlyMetadata as { role?: string } | null)?.role;
  const side: "founder" | "investor" =
    sp.side === "investor" || sp.side === "founder"
      ? sp.side
      : role === "investor"
      ? "investor"
      : "founder";

  let currentFounderPlan: string | null = null;
  let currentInvestorPlan: string | null = null;
  let pilotAvailable = true;
  if (user) {
    const [f, i] = await Promise.all([
      getFounderEntitlement(user.id),
      getInvestorEntitlement({ userId: user.id, email: user.primaryEmail }),
    ]);
    currentFounderPlan = f.plan.id;
    currentInvestorPlan = i.active ? i.plan?.id ?? null : null;
    pilotAvailable = !i.pilotExhausted && !i.active;
  }

  return (
    <PricingPage
      initialSide={side}
      signedIn={!!user}
      displayName={user?.displayName ?? null}
      currentFounderPlan={currentFounderPlan}
      currentInvestorPlan={currentInvestorPlan}
      pilotAvailable={pilotAvailable}
      paymentsReady={isStripeConfigured()}
      contactEmail={
        process.env.SALES_EMAIL || process.env.GMAIL_USER || "hello@laelapx.com"
      }
    />
  );
}
