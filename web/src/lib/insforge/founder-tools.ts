import "server-only";
import { getInsforge } from "./client";

/**
 * Founder tools data: events + RSVPs, async support threads, deep deck
 * reviews, and per-revision score history. Tables: db/0010.
 */

/* ─── EVENTS ─────────────────────────────────────────────────────────── */

export type EventKind = "education" | "workshop" | "community" | "in_person";

export type StoredEvent = {
  id: string;
  title: string;
  description: string | null;
  kind: EventKind;
  startsAt: string;
  durationMin: number;
  location: string | null;
  joinUrl: string | null;
  capacity: number | null;
  createdAt: string;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  kind: EventKind;
  starts_at: string;
  duration_min: number;
  location: string | null;
  join_url: string | null;
  capacity: number | null;
  created_at: string;
};

const eventRowToStored = (r: EventRow): StoredEvent => ({
  id: r.id,
  title: r.title,
  description: r.description,
  kind: r.kind,
  startsAt: r.starts_at,
  durationMin: r.duration_min,
  location: r.location,
  joinUrl: r.join_url,
  capacity: r.capacity,
  createdAt: r.created_at,
});

/** Upcoming first; includes events that started in the last day. */
export async function listUpcomingEvents(): Promise<StoredEvent[]> {
  const client = getInsforge();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await client.database
    .from("events")
    .select("*")
    .gte("starts_at", since)
    .order("starts_at", { ascending: true })
    .limit(100);
  return ((data ?? []) as EventRow[]).map(eventRowToStored);
}

export async function listAllEvents(): Promise<StoredEvent[]> {
  const client = getInsforge();
  const { data } = await client.database
    .from("events")
    .select("*")
    .order("starts_at", { ascending: false })
    .limit(200);
  return ((data ?? []) as EventRow[]).map(eventRowToStored);
}

export async function getEvent(id: string): Promise<StoredEvent | null> {
  const client = getInsforge();
  const { data } = await client.database.from("events").select("*").eq("id", id).maybeSingle();
  return data ? eventRowToStored(data as EventRow) : null;
}

export async function createEvent(input: {
  title: string;
  description: string | null;
  kind: EventKind;
  startsAt: string;
  durationMin: number;
  location: string | null;
  joinUrl: string | null;
  capacity: number | null;
  createdByUserId: string;
}): Promise<StoredEvent> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("events")
    .insert({
      title: input.title,
      description: input.description,
      kind: input.kind,
      starts_at: input.startsAt,
      duration_min: input.durationMin,
      location: input.location,
      join_url: input.joinUrl,
      capacity: input.capacity,
      created_by_user_id: input.createdByUserId,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createEvent: ${error.message}`);
  return eventRowToStored(data as EventRow);
}

export async function deleteEvent(id: string): Promise<void> {
  const client = getInsforge();
  await client.database.from("events").delete().eq("id", id);
}

/** event id → RSVP'd user ids. */
export async function listRsvps(eventIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (eventIds.length === 0) return map;
  const client = getInsforge();
  const { data } = await client.database
    .from("event_rsvps")
    .select("event_id, user_id")
    .in("event_id", eventIds);
  for (const r of (data ?? []) as { event_id: string; user_id: string }[]) {
    const list = map.get(r.event_id) ?? [];
    list.push(r.user_id);
    map.set(r.event_id, list);
  }
  return map;
}

export async function addRsvp(eventId: string, userId: string): Promise<void> {
  const client = getInsforge();
  const { error } = await client.database.from("event_rsvps").insert({ event_id: eventId, user_id: userId });
  if (error && (error as { code?: string }).code !== "23505") {
    throw new Error(`addRsvp: ${error.message}`);
  }
}

export async function removeRsvp(eventId: string, userId: string): Promise<void> {
  const client = getInsforge();
  await client.database.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", userId);
}

/* ─── SUPPORT ────────────────────────────────────────────────────────── */

export type StoredSupportMessage = {
  id: string;
  threadUserId: string;
  senderUserId: string;
  fromTeam: boolean;
  body: string;
  readByFounder: boolean;
  readByTeam: boolean;
  createdAt: string;
};

type SupportRow = {
  id: string;
  thread_user_id: string;
  sender_user_id: string;
  from_team: boolean;
  body: string;
  read_by_founder: boolean;
  read_by_team: boolean;
  created_at: string;
};

const supportRowToStored = (r: SupportRow): StoredSupportMessage => ({
  id: r.id,
  threadUserId: r.thread_user_id,
  senderUserId: r.sender_user_id,
  fromTeam: r.from_team,
  body: r.body,
  readByFounder: r.read_by_founder,
  readByTeam: r.read_by_team,
  createdAt: r.created_at,
});

export async function listSupportThread(threadUserId: string): Promise<StoredSupportMessage[]> {
  const client = getInsforge();
  const { data } = await client.database
    .from("support_messages")
    .select("*")
    .eq("thread_user_id", threadUserId)
    .order("created_at", { ascending: true })
    .limit(500);
  return ((data ?? []) as SupportRow[]).map(supportRowToStored);
}

export async function addSupportMessage(input: {
  threadUserId: string;
  senderUserId: string;
  fromTeam: boolean;
  body: string;
}): Promise<StoredSupportMessage> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("support_messages")
    .insert({
      thread_user_id: input.threadUserId,
      sender_user_id: input.senderUserId,
      from_team: input.fromTeam,
      body: input.body,
      // The sender has obviously read their own message.
      read_by_founder: !input.fromTeam,
      read_by_team: input.fromTeam,
    })
    .select("*")
    .single();
  if (error) throw new Error(`addSupportMessage: ${error.message}`);
  return supportRowToStored(data as SupportRow);
}

export async function markSupportRead(threadUserId: string, by: "founder" | "team"): Promise<void> {
  const client = getInsforge();
  const col = by === "founder" ? "read_by_founder" : "read_by_team";
  await client.database
    .from("support_messages")
    .update({ [col]: true })
    .eq("thread_user_id", threadUserId)
    .eq(col, false);
}

/**
 * Admin inbox: every thread with its messages (oldest first), newest
 * activity first, and how many founder messages the team hasn't read.
 */
export async function listSupportInbox(): Promise<
  { threadUserId: string; messages: StoredSupportMessage[]; lastAt: string; unreadByTeam: number }[]
> {
  const client = getInsforge();
  const { data } = await client.database
    .from("support_messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(3000);
  const rows = ((data ?? []) as SupportRow[]).map(supportRowToStored);
  const threads = new Map<string, StoredSupportMessage[]>();
  for (const m of rows) {
    const list = threads.get(m.threadUserId) ?? [];
    list.push(m);
    threads.set(m.threadUserId, list);
  }
  return Array.from(threads.entries())
    .map(([threadUserId, messages]) => ({
      threadUserId,
      messages,
      lastAt: messages[messages.length - 1].createdAt,
      unreadByTeam: messages.filter((m) => !m.fromTeam && !m.readByTeam).length,
    }))
    .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
}

/* ─── DECK REVIEWS ───────────────────────────────────────────────────── */

export type SlideVerdict = "strong" | "ok" | "weak";

export type DeckReviewBody = {
  summary: string;
  storyline: string;
  slides: { index: number; title: string; verdict: SlideVerdict; note: string }[];
  missing: string[];
  topFixes: { title: string; why: string; fix: string }[];
};

export type StoredDeckReview = {
  id: string;
  submissionId: string;
  deckUrl: string;
  status: "ok" | "unreadable" | "error";
  deckScore: number | null;
  review: DeckReviewBody | null;
  error: string | null;
  createdAt: string;
};

type DeckReviewRow = {
  id: string;
  submission_id: string;
  deck_url: string;
  status: "ok" | "unreadable" | "error";
  deck_score: number | null;
  review: DeckReviewBody | null;
  error: string | null;
  created_at: string;
};

const deckRowToStored = (r: DeckReviewRow): StoredDeckReview => ({
  id: r.id,
  submissionId: r.submission_id,
  deckUrl: r.deck_url,
  status: r.status,
  deckScore: r.deck_score,
  review: r.review,
  error: r.error,
  createdAt: r.created_at,
});

export async function listDeckReviews(submissionId: string): Promise<StoredDeckReview[]> {
  const client = getInsforge();
  const { data } = await client.database
    .from("deck_reviews")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(20);
  return ((data ?? []) as DeckReviewRow[]).map(deckRowToStored);
}

/** Successful reviews in the trailing 30 days — the monthly cap window. */
export function countDeckReviewsLast30Days(userId: string): Promise<number> {
  return countDeckReviewsSince(userId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
}

export async function countDeckReviewsSince(userId: string, sinceIso: string): Promise<number> {
  const client = getInsforge();
  const { count } = await client.database
    .from("deck_reviews")
    .select("id", { count: "exact", head: true })
    .eq("requested_by_user_id", userId)
    .eq("status", "ok")
    .gte("created_at", sinceIso);
  return count ?? 0;
}

export async function saveDeckReview(input: {
  submissionId: string;
  requestedByUserId: string;
  deckUrl: string;
  status: "ok" | "unreadable" | "error";
  deckScore: number | null;
  review: DeckReviewBody | null;
  error: string | null;
  model: string | null;
}): Promise<StoredDeckReview> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("deck_reviews")
    .insert({
      submission_id: input.submissionId,
      requested_by_user_id: input.requestedByUserId,
      deck_url: input.deckUrl,
      status: input.status,
      deck_score: input.deckScore,
      review: input.review,
      error: input.error,
      model: input.model,
    })
    .select("*")
    .single();
  if (error) throw new Error(`saveDeckReview: ${error.message}`);
  return deckRowToStored(data as DeckReviewRow);
}

/* ─── SCORE HISTORY ──────────────────────────────────────────────────── */

export type ScoreHistoryPoint = {
  submissionUpdatedAt: string;
  composite: number;
  rating: string;
  sections: { id: string; name: string; score: number }[];
  createdAt: string;
};

export async function recordScoreHistory(input: {
  submissionId: string;
  submissionUpdatedAt: string;
  composite: number;
  rating: string;
  sections: { id: string; name: string; score: number }[];
}): Promise<void> {
  const client = getInsforge();
  const { error } = await client.database.from("score_history").insert({
    submission_id: input.submissionId,
    submission_updated_at: input.submissionUpdatedAt,
    composite: input.composite,
    rating: input.rating,
    sections: input.sections,
  });
  // Unique violation = this revision is already recorded.
  if (error && (error as { code?: string }).code !== "23505") {
    console.error("[score_history] insert failed:", error.message);
  }
}

export async function listScoreHistory(submissionId: string): Promise<ScoreHistoryPoint[]> {
  const client = getInsforge();
  const { data } = await client.database
    .from("score_history")
    .select("submission_updated_at, composite, rating, sections, created_at")
    .eq("submission_id", submissionId)
    .order("submission_updated_at", { ascending: true })
    .limit(50);
  return (
    (data ?? []) as {
      submission_updated_at: string;
      composite: number;
      rating: string;
      sections: { id: string; name: string; score: number }[] | null;
      created_at: string;
    }[]
  ).map((r) => ({
    submissionUpdatedAt: r.submission_updated_at,
    composite: r.composite,
    rating: r.rating,
    sections: r.sections ?? [],
    createdAt: r.created_at,
  }));
}
