import "server-only";
import { getInsforge } from "./client";
import { getSubmissionBySlug, type StoredSubmission } from "./submissions";
import { getInvestorByOwner } from "./investors";

/* ─── TYPES ───────────────────────────────────────────────────────────── */
export type StoredConversation = {
  id: string;
  submissionId: string;
  founderUserId: string;
  investorUserId: string;
  connectId: string | null;
  createdAt: string;
  lastMessageAt: string;
};

export type StoredMessage = {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  readByRecipient: boolean;
  sentAt: string;
};

type ConversationRow = {
  id: string;
  submission_id: string;
  founder_user_id: string;
  investor_user_id: string;
  connect_id: string | null;
  created_at: string;
  last_message_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  body: string;
  read_by_recipient: boolean;
  sent_at: string;
};

function rowToConvo(r: ConversationRow): StoredConversation {
  return {
    id: r.id,
    submissionId: r.submission_id,
    founderUserId: r.founder_user_id,
    investorUserId: r.investor_user_id,
    connectId: r.connect_id,
    createdAt: r.created_at,
    lastMessageAt: r.last_message_at,
  };
}

function rowToMessage(r: MessageRow): StoredMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderUserId: r.sender_user_id,
    body: r.body,
    readByRecipient: r.read_by_recipient,
    sentAt: r.sent_at,
  };
}

/* ─── CREATE / UPSERT ─────────────────────────────────────────────────── */

/**
 * Idempotent: if a conversation already exists for (submissionId, investorUserId),
 * return it. Otherwise insert a new one.
 */
export async function ensureConversation(input: {
  submissionId: string;
  founderUserId: string;
  investorUserId: string;
  connectId?: string | null;
}): Promise<StoredConversation> {
  const client = getInsforge();

  const existing = await client.database
    .from("conversations")
    .select("*")
    .eq("submission_id", input.submissionId)
    .eq("investor_user_id", input.investorUserId)
    .maybeSingle();

  if (existing.data) return rowToConvo(existing.data as ConversationRow);

  const { data, error } = await client.database
    .from("conversations")
    .insert({
      submission_id: input.submissionId,
      founder_user_id: input.founderUserId,
      investor_user_id: input.investorUserId,
      connect_id: input.connectId ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`ensureConversation: ${error.message}`);
  return rowToConvo(data as ConversationRow);
}

export async function sendMessage(input: {
  conversationId: string;
  senderUserId: string;
  body: string;
}): Promise<StoredMessage> {
  const client = getInsforge();
  const trimmed = input.body.trim();
  if (!trimmed) throw new Error("Message body required");

  const { data, error } = await client.database
    .from("messages")
    .insert({
      conversation_id: input.conversationId,
      sender_user_id: input.senderUserId,
      body: trimmed,
    })
    .select("*")
    .single();
  if (error) throw new Error(`sendMessage: ${error.message}`);

  // Bump the parent conversation's last_message_at.
  await client.database
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", input.conversationId);

  return rowToMessage(data as MessageRow);
}

/* ─── READ ────────────────────────────────────────────────────────────── */

export async function getConversation(
  conversationId: string
): Promise<StoredConversation | null> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) throw new Error(`getConversation: ${error.message}`);
  if (!data) return null;
  return rowToConvo(data as ConversationRow);
}

export async function listMessages(
  conversationId: string
): Promise<StoredMessage[]> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("sent_at", { ascending: true })
    .limit(500);
  if (error) throw new Error(`listMessages: ${error.message}`);
  return (data as MessageRow[]).map(rowToMessage);
}

/**
 * Conversations the user is part of (either founder or investor side),
 * with derived display info (other party name, last message preview).
 */
export type ConversationListItem = {
  id: string;
  submissionId: string;
  submissionSlug: string;
  startupName: string;
  otherUserId: string;
  otherDisplayName: string;       // fund name (if other is investor) or company name (if other is founder)
  otherSubtitle: string | null;   // partner name or one-liner
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unreadCount: number;
  iAm: "founder" | "investor";
};

export async function listConversationsForUser(
  userId: string
): Promise<ConversationListItem[]> {
  const client = getInsforge();

  const { data, error } = await client.database
    .from("conversations")
    .select("*")
    .or(`founder_user_id.eq.${userId},investor_user_id.eq.${userId}`)
    .order("last_message_at", { ascending: false })
    .limit(80);

  if (error) throw new Error(`listConversationsForUser: ${error.message}`);
  const rows = (data as ConversationRow[]) ?? [];
  if (rows.length === 0) return [];

  // Pull all relevant submissions + investors + last messages in parallel.
  const submissionIds = Array.from(new Set(rows.map((r) => r.submission_id)));
  const otherInvestorIds = rows
    .filter((r) => r.founder_user_id === userId)
    .map((r) => r.investor_user_id);

  const [subs, invs] = await Promise.all([
    client.database
      .from("submissions")
      .select("id, slug, company_name, one_liner")
      .in("id", submissionIds),
    otherInvestorIds.length
      ? client.database
          .from("investors")
          .select("owner_user_id, fund_name, partner_name")
          .in("owner_user_id", otherInvestorIds)
      : Promise.resolve({ data: [] }),
  ]);

  type SubRow = {
    id: string;
    slug: string;
    company_name: string;
    one_liner: string;
  };
  type InvRow = {
    owner_user_id: string;
    fund_name: string;
    partner_name: string | null;
  };

  const subMap = new Map<string, SubRow>(
    ((subs.data ?? []) as SubRow[]).map((s) => [s.id, s])
  );
  const invMap = new Map<string, InvRow>(
    ((invs.data ?? []) as InvRow[]).map((i) => [i.owner_user_id, i])
  );

  // Last-message preview + unread per conversation, in parallel.
  const previews = await Promise.all(
    rows.map(async (r) => {
      const [{ data: lastArr }, { count }] = await Promise.all([
        client.database
          .from("messages")
          .select("body, sender_user_id, sent_at")
          .eq("conversation_id", r.id)
          .order("sent_at", { ascending: false })
          .limit(1),
        client.database
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", r.id)
          .eq("read_by_recipient", false)
          .neq("sender_user_id", userId),
      ]);
      const last = (lastArr as { body: string }[] | null)?.[0] ?? null;
      return {
        convoId: r.id,
        preview: last?.body ?? null,
        unread: count ?? 0,
      };
    })
  );
  const previewMap = new Map(previews.map((p) => [p.convoId, p]));

  return rows.map((r): ConversationListItem => {
    const sub = subMap.get(r.submission_id);
    const iAm = r.founder_user_id === userId ? "founder" : "investor";
    const otherUserId =
      iAm === "founder" ? r.investor_user_id : r.founder_user_id;
    const inv = invMap.get(otherUserId);
    const p = previewMap.get(r.id);
    return {
      id: r.id,
      submissionId: r.submission_id,
      submissionSlug: sub?.slug ?? "",
      startupName: sub?.company_name ?? "Unknown startup",
      otherUserId,
      otherDisplayName:
        iAm === "founder"
          ? inv?.fund_name ?? "Investor"
          : sub?.company_name ?? "Founder",
      otherSubtitle:
        iAm === "founder"
          ? inv?.partner_name ?? null
          : sub?.one_liner ?? null,
      lastMessageAt: r.last_message_at,
      lastMessagePreview: p?.preview ?? null,
      unreadCount: p?.unread ?? 0,
      iAm,
    };
  });
}

export async function markMessagesRead(
  conversationId: string,
  recipientUserId: string
): Promise<void> {
  const client = getInsforge();
  await client.database
    .from("messages")
    .update({ read_by_recipient: true })
    .eq("conversation_id", conversationId)
    .neq("sender_user_id", recipientUserId)
    .eq("read_by_recipient", false);
}

/* ─── DERIVED HELPERS ─────────────────────────────────────────────────── */

/**
 * Resolve the human-friendly "who's the other party" + their submission
 * for the conversation thread page header.
 */
export async function describeOtherParty(input: {
  conversation: StoredConversation;
  viewerUserId: string;
}): Promise<{
  iAm: "founder" | "investor";
  submission: StoredSubmission | null;
  otherDisplayName: string;
  otherSubtitle: string | null;
}> {
  const isFounder = input.conversation.founderUserId === input.viewerUserId;
  const submission = await getSubmissionBySlugById(
    input.conversation.submissionId
  );
  if (isFounder) {
    const inv = await getInvestorByOwner(input.conversation.investorUserId);
    return {
      iAm: "founder",
      submission,
      otherDisplayName: inv?.data.fundName ?? "Investor",
      otherSubtitle: inv?.data.partnerName ?? inv?.data.thesisOneLiner ?? null,
    };
  }
  return {
    iAm: "investor",
    submission,
    otherDisplayName: submission?.data.companyName ?? "Founder",
    otherSubtitle: submission?.data.oneLiner ?? null,
  };
}

async function getSubmissionBySlugById(
  submissionId: string
): Promise<StoredSubmission | null> {
  // Helper to fetch a submission by its UUID id (rather than slug).
  const client = getInsforge();
  const { data } = await client.database
    .from("submissions")
    .select("slug")
    .eq("id", submissionId)
    .maybeSingle();
  if (!data) return null;
  return getSubmissionBySlug((data as { slug: string }).slug);
}
