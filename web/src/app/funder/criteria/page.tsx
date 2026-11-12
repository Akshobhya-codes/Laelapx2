import { loadInvestorPage } from "@/lib/billing/investor-page";
import { getCustomCriteria, EMPTY_CRITERIA } from "@/lib/insforge/investor-workspace";
import { listInvestorVisibleSubmissions } from "@/lib/billing/discovery";
import { failsCriteria } from "@/lib/billing/criteria";
import { buildSnapshot } from "@/lib/scoring/rubric";
import { PRODUCT_STAGES } from "@/lib/submission/schema";
import { CriteriaForm } from "./criteria-client";

export const metadata = { title: "Custom criteria · Laelapx" };
export const dynamic = "force-dynamic";

export default async function CriteriaPage() {
  const { user, ent, planBadge } = await loadInvestorPage();
  const allowed = !!(ent.active && ent.plan?.features.customCriteria);

  const [criteria, visible] = allowed
    ? await Promise.all([
        getCustomCriteria(ent.accountUserId),
        listInvestorVisibleSubmissions({ limit: 200, priority: true }),
      ])
    : [EMPTY_CRITERIA, null];

  // A compact projection of the visible pool, so the form can preview how
  // many founders each criterion keeps — live, as the investor types.
  const pool = (visible?.submissions ?? [])
    .filter((s) => s.ownerUserId !== user.id)
    .map((s) => ({
      launched: s.data.launched,
      mrrUsd: s.data.mrrUsd ?? 0,
      customers: s.data.customerCount,
      score: s.scoredSnapshot?.composite ?? buildSnapshot(s.data).composite,
      country: s.data.hqCountry,
      productStage: s.data.productStage,
      text: `${s.data.oneLiner} ${s.data.problemDescription} ${s.data.solutionDescription} ${s.data.sectors.join(" ")}`.toLowerCase(),
    }));
  // Server-side count with the saved criteria, as a sanity anchor.
  const savedKept = (visible?.submissions ?? []).filter(
    (s) => s.ownerUserId !== user.id && failsCriteria(s, criteria) === null
  ).length;

  return (
    <CriteriaForm
      displayName={user.displayName}
      profileImageUrl={user.profileImageUrl}
      planBadge={planBadge}
      allowed={allowed}
      initial={criteria}
      pool={pool}
      savedKept={savedKept}
      productStageOptions={[...PRODUCT_STAGES]}
    />
  );
}
