import { notFound } from "next/navigation";
import { StartupPage } from "@/components/startup/startup-page";
import { StartupActionBar } from "@/components/startup/startup-action-bar";
import { getSubmissionBySlug } from "@/lib/insforge/submissions";
import { getInvestorByOwner } from "@/lib/insforge/investors";
import {
  recordView,
  isSavedByInvestor,
  hasPendingConnect,
} from "@/lib/insforge/audience";
import { notifyViewIfFresh } from "@/lib/insforge/notifications";
import { stackServerApp } from "@/stack";
import type { Metadata } from "next";

type Params = { slug: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const stored = await getSubmissionBySlug(slug);
  if (!stored) return { title: "Not found · Laelapx" };
  return {
    title: `${stored.data.companyName} · ${stored.data.oneLiner}`,
    description: stored.data.oneLiner,
    openGraph: {
      title: `${stored.data.companyName} · Laelapx`,
      description: stored.data.oneLiner,
    },
  };
}

export default async function StartupSlugPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const stored = await getSubmissionBySlug(slug);
  if (!stored) notFound();

  // Identify viewer (signed-in or anonymous).
  const viewer = await stackServerApp.getUser({ or: "return-null" });
  const isOwner = viewer?.id === stored.ownerUserId;

  // Determine viewer role + subscription proxy.
  // (Real subscription state will come from Stripe in a later iteration.
  //  For now: "is the viewer an investor with a thesis on the platform?"
  //  also counts as subscribed. Owners always see their own contact info.)
  let viewerRole: "owner" | "investor" | "founder" | "anonymous" = "anonymous";
  let viewerInvestor = null as Awaited<ReturnType<typeof getInvestorByOwner>>;
  if (viewer) {
    if (isOwner) viewerRole = "owner";
    else {
      viewerInvestor = await getInvestorByOwner(viewer.id);
      viewerRole = viewerInvestor ? "investor" : "founder";
    }
    // Even owners can have an investor profile (operator-VCs); fetch it so
    // the action bar still works in test mode.
    if (isOwner && !viewerInvestor) {
      viewerInvestor = await getInvestorByOwner(viewer.id);
    }
  }

  const canSeeContact = isOwner || (!!viewer && !!viewerInvestor);
  const canActAsInvestor = !!viewer && !!viewerInvestor;

  // Record every view (incl. owner self-views — useful for QA + transparent
  // counts). Audience stats filter by role to compute "unique investor viewers".
  await recordView({
    submissionId: stored.id,
    viewerUserId: viewer?.id ?? null,
    viewerRole,
  });

  // Notify the founder of investor views (rate-limited per investor per 24h).
  // Skip when the viewer is the owner themselves (no point notifying yourself).
  if (viewer && viewerRole === "investor" && !isOwner && viewerInvestor) {
    await notifyViewIfFresh({
      recipientUserId: stored.ownerUserId,
      fromUserId: viewer.id,
      startupSlug: stored.slug,
      startupName: stored.data.companyName,
      fundName: viewerInvestor.data.fundName,
    });
  }

  // For investor viewers (incl. owners testing): pre-fetch save / connect state.
  let initialSaved = false;
  let initialConnectPending = false;
  if (canActAsInvestor) {
    [initialSaved, initialConnectPending] = await Promise.all([
      isSavedByInvestor(stored.id, viewer!.id),
      hasPendingConnect(stored.id, viewer!.id),
    ]);
  }

  // Redact protected reach-out URLs before they reach the client bundle. We
  // also expose a "locks" map so the UI can still render the blurred slot
  // ("there's a LinkedIn here, but you need to subscribe") without leaking
  // the actual URL into the hydration payload.
  const locks = {
    demoVideo: !!stored.data.demoVideoUrl,
    pitchDeck: !!stored.data.pitchDeckUrl,
    founderLinkedIns: stored.data.founders.map(
      (f) => !!(f.linkedinUrl && f.linkedinUrl.length > 0)
    ),
  };
  const safeData = canSeeContact
    ? stored.data
    : {
        ...stored.data,
        demoVideoUrl: "",
        pitchDeckUrl: "",
        founders: stored.data.founders.map((f) => ({
          ...f,
          linkedinUrl: "",
        })),
      };

  return (
    <>
      <StartupPage
        data={safeData}
        locks={locks}
        canSeeContact={canSeeContact}
        viewerSignedIn={!!viewer}
      />
      {canActAsInvestor && (
        <StartupActionBar
          slug={stored.slug}
          companyName={stored.data.companyName}
          initialSaved={initialSaved}
          initialConnectPending={initialConnectPending}
          isOwner={isOwner}
        />
      )}
    </>
  );
}
