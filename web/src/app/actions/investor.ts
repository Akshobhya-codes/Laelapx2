"use server";

import { revalidatePath } from "next/cache";
import { stackServerApp } from "@/stack";
import {
  toggleSave,
  requestConnect,
  respondToConnect,
} from "@/lib/insforge/audience";
import { getSubmissionBySlug } from "@/lib/insforge/submissions";
import { getInvestorByOwner } from "@/lib/insforge/investors";
import { createNotification } from "@/lib/insforge/notifications";
import {
  ensureConversation,
  sendMessage,
  getConversation,
} from "@/lib/insforge/messages";
import { getInsforge } from "@/lib/insforge/client";
import { sendEmail } from "@/lib/email/sender";
import {
  connectRequestedEmail,
  connectAcceptedEmail,
} from "@/lib/email/templates";

/**
 * Toggle save on a startup. Notifies the founder when newly saved.
 */
export async function toggleSaveAction(
  slug: string
): Promise<{ saved: boolean }> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const sub = await getSubmissionBySlug(slug);
  if (!sub) throw new Error("Submission not found");

  const saved = await toggleSave(sub.id, user.id);

  // Notify the founder when an investor newly saves their startup.
  if (saved && sub.ownerUserId !== user.id) {
    const inv = await getInvestorByOwner(user.id);
    await createNotification({
      userId: sub.ownerUserId,
      kind: "save",
      payload: {
        startupSlug: sub.slug,
        startupName: sub.data.companyName,
        fromUserId: user.id,
        fromName: user.displayName ?? null,
        fundName: inv?.data.fundName ?? "An investor",
      } as Record<string, unknown>,
      href: `/founder/${sub.slug}`,
    });
  }

  revalidatePath(`/s/${slug}`);
  revalidatePath(`/funder/discover`);
  return { saved };
}

/**
 * Send a connect request from the signed-in investor to a startup.
 * Notifies the founder.
 */
export async function requestConnectAction(
  slug: string,
  message: string
): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const sub = await getSubmissionBySlug(slug);
  if (!sub) throw new Error("Submission not found");

  await requestConnect(sub.id, user.id, message.trim() || null);

  if (sub.ownerUserId !== user.id) {
    const inv = await getInvestorByOwner(user.id);
    await createNotification({
      userId: sub.ownerUserId,
      kind: "connect_requested",
      payload: {
        startupSlug: sub.slug,
        startupName: sub.data.companyName,
        fromUserId: user.id,
        fromName: user.displayName ?? null,
        fundName: inv?.data.fundName ?? "An investor",
        message: message.trim() || null,
      } as Record<string, unknown>,
      href: `/founder/${sub.slug}`,
    });

    // Email the founder.
    const founder = await stackServerApp.getUser(sub.ownerUserId);
    if (founder?.primaryEmail) {
      const tpl = connectRequestedEmail({
        founderFirstName: founder.displayName?.split(" ")[0] || "there",
        fundName: inv?.data.fundName ?? "An investor",
        startupName: sub.data.companyName,
        startupSlug: sub.slug,
        message: message.trim() || null,
      });
      await sendEmail({
        to: founder.primaryEmail,
        subject: tpl.subject,
        html: tpl.html,
      });
    }
  }

  revalidatePath(`/s/${slug}`);
}

/**
 * Founder-side: accept or decline an incoming connect request.
 * On accept: auto-create a conversation (seeded with the connect's message),
 * then notify the investor with a link to the new conversation.
 * On decline: notify investor (lighter).
 */
export async function respondConnectAction(
  connectId: string,
  accept: boolean,
  ownerSlug: string
): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });

  // Fetch the connect request so we know who to notify and what message to seed.
  const client = getInsforge();
  const { data: connectRow } = await client.database
    .from("connect_requests")
    .select("id, submission_id, investor_user_id, message")
    .eq("id", connectId)
    .maybeSingle();

  if (!connectRow) throw new Error("Connect request not found");
  const connect = connectRow as {
    id: string;
    submission_id: string;
    investor_user_id: string;
    message: string | null;
  };

  await respondToConnect(connectId, accept);

  // Look up the submission to get founder id + slug + name.
  const sub = await getSubmissionBySlug(ownerSlug);
  if (!sub) throw new Error("Submission not found");
  // Defense-in-depth: only the owner can respond.
  if (sub.ownerUserId !== user.id) throw new Error("Not authorized");

  if (accept) {
    // Create / fetch the conversation.
    const convo = await ensureConversation({
      submissionId: sub.id,
      founderUserId: sub.ownerUserId,
      investorUserId: connect.investor_user_id,
      connectId: connect.id,
    });

    // Seed with the original connect message as the first message from the investor.
    if (connect.message && connect.message.trim()) {
      await sendMessage({
        conversationId: convo.id,
        senderUserId: connect.investor_user_id,
        body: connect.message.trim(),
      });
    }

    // Notify the investor that they were accepted.
    await createNotification({
      userId: connect.investor_user_id,
      kind: "connect_accepted",
      payload: {
        startupSlug: sub.slug,
        startupName: sub.data.companyName,
        fromUserId: user.id,
        fromName: user.displayName ?? null,
        conversationId: convo.id,
      } as Record<string, unknown>,
      href: `/messages/${convo.id}`,
    });

    // Email the investor.
    const investor = await stackServerApp.getUser(connect.investor_user_id);
    if (investor?.primaryEmail) {
      const tpl = connectAcceptedEmail({
        investorFirstName: investor.displayName?.split(" ")[0] || "there",
        startupName: sub.data.companyName,
        conversationId: convo.id,
      });
      await sendEmail({
        to: investor.primaryEmail,
        subject: tpl.subject,
        html: tpl.html,
      });
    }
  } else {
    await createNotification({
      userId: connect.investor_user_id,
      kind: "connect_declined",
      payload: {
        startupSlug: sub.slug,
        startupName: sub.data.companyName,
        fromUserId: user.id,
        fromName: user.displayName ?? null,
      } as Record<string, unknown>,
      href: `/funder/discover`,
    });
  }

  revalidatePath(`/founder/${ownerSlug}`);
}

/* ─── MESSAGING ──────────────────────────────────────────────────────── */
/**
 * Send a message in an existing conversation. Notifies the recipient.
 */
export async function sendMessageAction(
  conversationId: string,
  body: string
): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const trimmed = body.trim();
  if (!trimmed) return;

  const convo = await getConversation(conversationId);
  if (!convo) throw new Error("Conversation not found");
  if (
    convo.founderUserId !== user.id &&
    convo.investorUserId !== user.id
  ) {
    throw new Error("Not authorized");
  }

  await sendMessage({
    conversationId,
    senderUserId: user.id,
    body: trimmed,
  });

  // Notify the OTHER party.
  const recipientUserId =
    convo.founderUserId === user.id
      ? convo.investorUserId
      : convo.founderUserId;

  await createNotification({
    userId: recipientUserId,
    kind: "message_received",
    payload: {
      fromUserId: user.id,
      fromName: user.displayName ?? null,
      message: trimmed.slice(0, 140),
      conversationId,
    } as Record<string, unknown>,
    href: `/messages/${conversationId}`,
  });

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath(`/messages`);
}
