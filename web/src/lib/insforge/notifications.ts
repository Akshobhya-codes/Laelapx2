import "server-only";
import { getInsforge } from "./client";

export type NotificationKind =
  | "view"
  | "save"
  | "connect_requested"
  | "connect_accepted"
  | "connect_declined"
  | "message_received";

export type NotificationPayload = {
  startupSlug?: string;
  startupName?: string;
  fundName?: string;
  fromUserId?: string;
  fromName?: string;
  message?: string;
  conversationId?: string;
};

export type StoredNotification = {
  id: string;
  userId: string;
  kind: NotificationKind;
  payload: NotificationPayload;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  user_id: string;
  kind: NotificationKind;
  payload: NotificationPayload;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

function rowToStored(r: NotificationRow): StoredNotification {
  return {
    id: r.id,
    userId: r.user_id,
    kind: r.kind,
    payload: r.payload ?? {},
    href: r.href,
    readAt: r.read_at,
    createdAt: r.created_at,
  };
}

/* ─── CREATE ──────────────────────────────────────────────────────────── */
/**
 * Insert a notification. Caller is responsible for not creating spammy
 * duplicates — see `notifyViewIfFresh` for view-specific rate limiting.
 */
export async function createNotification(input: {
  userId: string;
  kind: NotificationKind;
  payload: NotificationPayload;
  href?: string;
}): Promise<void> {
  const client = getInsforge();
  await client.database.from("notifications").insert({
    user_id: input.userId,
    kind: input.kind,
    payload: input.payload,
    href: input.href ?? null,
  });
}

/**
 * Like createNotification but only fires if there isn't already an unread
 * notification of the same kind from the same source in the last `windowMin`
 * minutes — used for view notifications so an investor refreshing the page
 * 10 times doesn't spam the founder.
 */
export async function notifyViewIfFresh({
  recipientUserId,
  fromUserId,
  startupSlug,
  startupName,
  fundName,
  windowMin = 60 * 24, // 24 hours
}: {
  recipientUserId: string;
  fromUserId: string;
  startupSlug: string;
  startupName: string;
  fundName: string;
  windowMin?: number;
}): Promise<void> {
  const client = getInsforge();
  const since = new Date(Date.now() - windowMin * 60 * 1000).toISOString();

  // Look for an existing 'view' notification for this recipient with the same
  // fromUserId in the time window.
  const { data: recent } = await client.database
    .from("notifications")
    .select("id, payload")
    .eq("user_id", recipientUserId)
    .eq("kind", "view")
    .gte("created_at", since)
    .limit(50);

  const exists = ((recent ?? []) as { payload: NotificationPayload }[]).some(
    (r) => r.payload?.fromUserId === fromUserId
  );
  if (exists) return;

  await createNotification({
    userId: recipientUserId,
    kind: "view",
    payload: { startupSlug, startupName, fromUserId, fundName },
    href: `/founder/${startupSlug}`,
  });
}

/* ─── READ ────────────────────────────────────────────────────────────── */
export async function listNotifications(
  userId: string,
  limit = 20
): Promise<StoredNotification[]> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listNotifications: ${error.message}`);
  return (data as NotificationRow[]).map(rowToStored);
}

export async function countUnread(userId: string): Promise<number> {
  const client = getInsforge();
  const { count, error } = await client.database
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw new Error(`countUnread: ${error.message}`);
  return count ?? 0;
}

/* ─── MARK READ ───────────────────────────────────────────────────────── */
export async function markAllRead(userId: string): Promise<void> {
  const client = getInsforge();
  const now = new Date().toISOString();
  await client.database
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", userId)
    .is("read_at", null);
}

export async function markRead(
  notificationId: string,
  userId: string
): Promise<void> {
  const client = getInsforge();
  const now = new Date().toISOString();
  await client.database
    .from("notifications")
    .update({ read_at: now })
    .eq("id", notificationId)
    .eq("user_id", userId);
}
