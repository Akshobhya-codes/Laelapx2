import { notFound } from "next/navigation";
import { stackServerApp } from "@/stack";
import {
  getProfileBySlug,
  ensureProfile,
} from "@/lib/insforge/profiles";
import {
  ProfilePage,
  HiddenProfile,
  type StartupSummary,
  type InvestorSummary,
} from "@/components/profile/profile-page";
import { listSubmissionsByOwner } from "@/lib/insforge/submissions";
import { getInvestorByOwner } from "@/lib/insforge/investors";
import type { Metadata } from "next";

type Params = { slug: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProfileBySlug(slug);
  if (!p) return { title: "Not found · Laelapx" };
  return {
    title: `${p.displayName} · Laelapx`,
    description: p.headline ?? `${p.displayName}'s profile on Laelapx.`,
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  // Auth-gate: profiles are visible to signed-in users only (subscriber proxy).
  const viewer = await stackServerApp.getUser({ or: "redirect" });

  // Refresh viewer's own profile cache while we're at it.
  await ensureProfile({
    userId: viewer.id,
    displayName: viewer.displayName,
    email: viewer.primaryEmail,
    profileImageUrl: viewer.profileImageUrl,
  });

  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) notFound();

  const isOwner = profile.userId === viewer.id;

  // Privacy gate: hidden profiles only show name to non-owners.
  if (profile.privacy.visibility === "hidden" && !isOwner) {
    return <HiddenProfile displayName={profile.displayName} />;
  }

  // Pull related entities respecting privacy toggles.
  const [submissions, investor] = await Promise.all([
    profile.privacy.showStartups
      ? listSubmissionsByOwner(profile.userId)
      : Promise.resolve([]),
    profile.privacy.showFund
      ? getInvestorByOwner(profile.userId)
      : Promise.resolve(null),
  ]);

  const startups: StartupSummary[] = submissions.map((s) => ({
    slug: s.slug,
    companyName: s.data.companyName,
    oneLiner: s.data.oneLiner,
    stage: s.data.stage,
    raisingUsd: s.data.raisingUsd,
    roundType: s.data.roundType,
    productStage: s.data.productStage,
    launched: s.data.launched,
  }));

  const investorSummary: InvestorSummary | null = investor
    ? {
        slug: investor.slug,
        fundName: investor.data.fundName,
        thesisOneLiner: investor.data.thesisOneLiner,
        partnerName: investor.data.partnerName ?? null,
        partnerTitle: investor.data.partnerTitle ?? null,
        hq: investor.data.hq ?? null,
        stages: investor.data.stages,
        sectors: investor.data.sectors,
      }
    : null;

  return (
    <ProfilePage
      profile={profile}
      startups={startups}
      investor={investorSummary}
      isOwner={isOwner}
    />
  );
}
