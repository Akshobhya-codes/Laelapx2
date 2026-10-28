import { notFound } from "next/navigation";
import { StartupPage } from "@/components/startup/startup-page";
import { StartupActionBar } from "@/components/startup/startup-action-bar";
import type { GateReason } from "@/components/startup/blurred-field";
import { PilotFeedback, InvestorWorkspace } from "@/components/billing/investor-widgets";
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
import { listMeetings } from "@/lib/insforge/investor-workspace";
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
   *   - an investor with an active plan, when the founder has opted in to
   *     investor contact, once this profile is unlocked for their account.
   *     The first open spends one unit of the weekly (or pilot) quota;
   *     later opens are free, for the whole team.
   * Without the founder's consent no plan unlocks anything, and no quota
   * is spent. Everyone else gets the page with those fields stripped
   * server-side.
   */
  const consented = stored.data.openToInvestorContact;
  let ent: InvestorEntitlement | null = null;
  let canSeeContact = isOwner;
  let gateReason: GateReason = "anon";
  let spentQuota = false;

  if (!isOwner && viewer) {
    ent = await getInvestorEntitlement({ userId: viewer.id, email: viewer.primaryEmail });
    if (!ent.active) {
      gateReason = ent.pilotExhausted || ent.subscription ? "expired" : "no-plan";
    } else if (!consented) {
      gateReason = "no-consent";
    } else {
      const r = await unlockProfileIfAllowed(ent, stored.id, viewer.id);
      canSeeContact = r.unlocked;
      spentQuota = r.spentQuota;
      if (!r.unlocked) gateReason = "quota";
    }
  } else if (!isOwner && !consented) {
    gateReason = "no-consent";
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

  // Investor-side state: save / connect, plus the workspace widgets the
  // plan includes. All of it only once the profile is actually open.
  let initialSaved = false;
  let initialConnectPending = false;
  if (canActAsInvestor) {
    [initialSaved, initialConnectPending] = await Promise.all([
      isSavedByInvestor(stored.id, viewer!.id),
      hasPendingConnect(stored.id, viewer!.id),
    ]);
  }

  const features = ent?.active ? ent.plan?.features : undefined;
  const opened = !isOwner && canSeeContact && !!ent;
  const showPilotFeedback = opened && ent!.plan?.id === "pilot";
  const showWorkspace = opened && !!features?.notes;
  const canTrackMeetings = opened && !!features?.meetingTracking;

  const [pilotFb, note, meetings] = await Promise.all([
    showPilotFeedback ? getPilotFeedbackMap(viewer!.id).then((m) => m.get(stored.id) ?? null) : null,
    showWorkspace ? getInvestorNote(ent!.accountUserId, stored.id) : null,
    canTrackMeetings ? listMeetings(ent!.accountUserId, stored.id) : [],
  ]);

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

  // Quota was computed before this unlock, so subtract the one just spent.
  let unlockToast: string | null = null;
  if (spentQuota && q) {
    if (q.total !== null && q.remainingTotal !== null) {
      unlockToast = `Profile unlocked · ${q.remainingTotal - 1} of ${q.total} pilot profiles left`;
    } else if (q.weekly !== null && q.remainingThisWeek !== null) {
      unlockToast = `Profile unlocked · ${q.remainingThisWeek - 1} of ${q.weekly} left this week`;
    }
  }

  return (
    <>
      <StartupPage
        data={safeData}
        locks={locks}
        canSeeContact={canSeeContact}
        viewerSignedIn={!!viewer}
        gateReason={gateReason}
        quotaNote={quotaNote}
        unlockToast={unlockToast}
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
          lockLabel={
            gateReason === "quota"
              ? "Weekly limit reached"
              : gateReason === "no-consent"
              ? "Founder not open to contact"
              : "Plan required to connect"
          }
        />
      )}
      {showPilotFeedback && (
        <PilotFeedback
          slug={stored.slug}
          initial={pilotFb ? { useful: pilotFb.useful, note: pilotFb.note } : null}
        />
      )}
      {showWorkspace && (
        <InvestorWorkspace
          slug={stored.slug}
          initialNote={note ? { body: note.body, stage: note.stage, updatedAt: note.updatedAt } : null}
          teamName={ent?.teamName ?? null}
          canTrackMeetings={canTrackMeetings}
          meetings={meetings.map((m) => ({
            id: m.id,
            metOn: m.metOn,
            kind: m.kind,
            attendees: m.attendees,
            notes: m.notes,
          }))}
        />
      )}
    </>
  );
}
