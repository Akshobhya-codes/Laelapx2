import { notFound } from "next/navigation";
import { StartupPage } from "@/components/startup/startup-page";
import { StartupActionBar } from "@/components/startup/startup-action-bar";
import type { GateReason } from "@/components/startup/blurred-field";
import { PilotFeedback, InvestorNote } from "@/components/billing/investor-widgets";
import { getSubmissionBySlug } from "@/lib/insforge/submissions";
import { getInvestorByOwner } from "@/lib/insforge/investors";
import {
  recordView,
  isSavedByInvestor,
  hasPendingConnect,
} from "@/lib/insforge/audience";
import { notifyViewIfFresh } from "@/lib/insforge/notifications";
import {
  getInvestorEntitlement,
  unlockProfileIfAllowed,
  type InvestorEntitlement,
} from "@/lib/billing/entitlements";
import { getPilotFeedbackMap, getInvestorNote } from "@/lib/insforge/billing";
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

  // Viewer role: owner / investor (has a thesis) / founder / anonymous.
  let viewerRole: "owner" | "investor" | "founder" | "anonymous" = "anonymous";
  let viewerInvestor = null as Awaited<ReturnType<typeof getInvestorByOwner>>;
  if (viewer) {
    if (isOwner) viewerRole = "owner";
    else {
      viewerInvestor = await getInvestorByOwner(viewer.id);
      viewerRole = viewerInvestor ? "investor" : "founder";
    }
    // Owners can have an investor profile too (operator-VCs); fetch it so
    // the action bar still works in test mode.
    if (isOwner && !viewerInvestor) {
      viewerInvestor = await getInvestorByOwner(viewer.id);
    }
  }

  /* ─── The paywall ────────────────────────────────────────────────────
   * Contact details (deck, demo, founder LinkedIns) are visible to:
   *   - the owner, always;
   *   - an investor with an active plan, once this profile is unlocked for
   *     their account. The first open spends one unit of the weekly (or
   *     pilot) quota; later opens are free, for the whole team.
   * Everyone else gets the page with those fields stripped server-side.
   */
  let ent: InvestorEntitlement | null = null;
  let canSeeContact = isOwner;
  let gateReason: GateReason = "anon";
  let spentQuota = false;

  if (!isOwner && viewer) {
    ent = await getInvestorEntitlement({ userId: viewer.id, email: viewer.primaryEmail });
    if (ent.active) {
      const r = await unlockProfileIfAllowed(ent, stored.id, viewer.id);
      canSeeContact = r.unlocked;
      spentQuota = r.spentQuota;
      if (!r.unlocked) gateReason = "quota";
    } else {
      gateReason = ent.pilotExhausted || ent.subscription ? "expired" : "no-plan";
    }
  }

  const canActAsInvestor = !!viewer && !!viewerInvestor;
  const canConnect = isOwner || (canActAsInvestor && canSeeContact);

  // Record every view (incl. owner self-views — useful for QA + transparent
  // counts). Audience stats filter by role to compute "unique investor viewers".
  await recordView({
    submissionId: stored.id,
    viewerUserId: viewer?.id ?? null,
    viewerRole,
  });

  // Notify the founder of investor views (rate-limited per investor per 24h).
  // Only for investors who actually opened the full profile.
  if (viewer && viewerRole === "investor" && !isOwner && viewerInvestor && canSeeContact) {
    await notifyViewIfFresh({
      recipientUserId: stored.ownerUserId,
      fromUserId: viewer.id,
      startupSlug: stored.slug,
      startupName: stored.data.companyName,
      fundName: viewerInvestor.data.fundName,
    });
  }

  // For investor viewers (incl. owners testing): pre-fetch save / connect state,
  // plus the pilot feedback and note widgets where the plan includes them.
  let initialSaved = false;
  let initialConnectPending = false;
  let pilotFeedback: { useful: boolean; note: string | null } | null = null;
  let note: { body: string; stage: string | null; updatedAt: string } | null = null;
  if (canActAsInvestor) {
    [initialSaved, initialConnectPending] = await Promise.all([
      isSavedByInvestor(stored.id, viewer!.id),
      hasPendingConnect(stored.id, viewer!.id),
    ]);
  }
  const showPilotFeedback = !isOwner && !!ent?.active && ent.plan?.id === "pilot" && canSeeContact;
  const showNotes = !isOwner && !!ent?.active && !!ent.plan?.features.notes;
  if (showPilotFeedback) {
    const fb = (await getPilotFeedbackMap(viewer!.id)).get(stored.id);
    pilotFeedback = fb ? { useful: fb.useful, note: fb.note } : null;
  }
  if (showNotes && ent) {
    const n = await getInvestorNote(ent.accountUserId, stored.id);
    note = n ? { body: n.body, stage: n.stage, updatedAt: n.updatedAt } : null;
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

  const q = ent?.quota;
  const quotaNote =
    gateReason === "quota" && q
      ? q.remainingTotal === 0
        ? `All ${q.total} pilot profiles used. Pick a plan to keep going.`
        : `${q.remainingThisWeek} of ${q.weekly} left · resets ${new Date(q.weekResetsAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}.`
      : null;

  return (
    <>
      <StartupPage
        data={safeData}
        locks={locks}
        canSeeContact={canSeeContact}
        viewerSignedIn={!!viewer}
        gateReason={gateReason}
        quotaNote={quotaNote}
        unlockToast={
          spentQuota && q ? { remaining: q.remainingThisWeek !== null ? q.remainingThisWeek - 1 : null, weekly: q.weekly } : null
        }
      />
      {canActAsInvestor && (
        <StartupActionBar
          slug={stored.slug}
          companyName={stored.data.companyName}
          initialSaved={initialSaved}
          initialConnectPending={initialConnectPending}
          isOwner={isOwner}
          canConnect={canConnect}
          lockHref={gateReason === "quota" ? "/billing?side=investor" : "/pricing?side=investor"}
          lockLabel={gateReason === "quota" ? "Weekly limit reached" : "Plan required to connect"}
        />
      )}
      {showPilotFeedback && <PilotFeedback slug={stored.slug} initial={pilotFeedback} />}
      {showNotes && <InvestorNote slug={stored.slug} initial={note} teamName={ent?.teamName ?? null} />}
    </>
  );
}
