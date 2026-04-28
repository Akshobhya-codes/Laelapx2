import "server-only";
import { getInsforge } from "./client";
import slugify from "slugify";
import { nanoid } from "nanoid";

export type Visibility = "public" | "hidden";

export type ProfilePrivacy = {
  visibility: Visibility;
  searchable: boolean;
  showStartups: boolean;
  showFund: boolean;
  showEmail: boolean;
};

export type StoredProfile = {
  userId: string;
  slug: string;
  displayName: string;
  email: string | null;
  profileImageUrl: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  privacy: ProfilePrivacy;
  createdAt: string;
  updatedAt: string;
};

type ProfileRow = {
  user_id: string;
  slug: string;
  display_name: string;
  email: string | null;
  profile_image_url: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  visibility: Visibility;
  searchable: boolean;
  show_startups: boolean;
  show_fund: boolean;
  show_email: boolean;
  created_at: string;
  updated_at: string;
};

function rowToStored(r: ProfileRow): StoredProfile {
  return {
    userId: r.user_id,
    slug: r.slug,
    displayName: r.display_name,
    email: r.email,
    profileImageUrl: r.profile_image_url,
    headline: r.headline,
    bio: r.bio,
    location: r.location,
    websiteUrl: r.website_url,
    linkedinUrl: r.linkedin_url,
    twitterUrl: r.twitter_url,
    privacy: {
      visibility: r.visibility,
      searchable: r.searchable,
      showStartups: r.show_startups,
      showFund: r.show_fund,
      showEmail: r.show_email,
    },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function makeProfileSlug(displayName: string): string {
  const base = slugify(displayName || "", { lower: true, strict: true });
  return base || nanoid(8);
}

/* ─── READ ────────────────────────────────────────────────────────────── */

export async function getProfileByUserId(
  userId: string
): Promise<StoredProfile | null> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`getProfileByUserId: ${error.message}`);
  if (!data) return null;
  return rowToStored(data as ProfileRow);
}

export async function getProfileBySlug(
  slug: string
): Promise<StoredProfile | null> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("profiles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getProfileBySlug: ${error.message}`);
  if (!data) return null;
  return rowToStored(data as ProfileRow);
}

/* ─── ENSURE / UPSERT ────────────────────────────────────────────────── */

/**
 * Lazy-create or refresh the profile row for a Stack Auth user.
 * Called from auth-gated pages so display_name + image stay synced.
 */
export async function ensureProfile(input: {
  userId: string;
  displayName: string | null;
  email: string | null;
  profileImageUrl: string | null;
}): Promise<StoredProfile> {
  const client = getInsforge();
  const existing = await getProfileByUserId(input.userId);

  if (existing) {
    // Refresh cached display fields when they change.
    const needsRefresh =
      (input.displayName && existing.displayName !== input.displayName) ||
      (input.profileImageUrl &&
        existing.profileImageUrl !== input.profileImageUrl) ||
      (input.email && existing.email !== input.email);
    if (!needsRefresh) return existing;
    const { data, error } = await client.database
      .from("profiles")
      .update({
        display_name: input.displayName ?? existing.displayName,
        email: input.email ?? existing.email,
        profile_image_url:
          input.profileImageUrl ?? existing.profileImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", input.userId)
      .select("*")
      .single();
    if (error) throw new Error(`ensureProfile (refresh): ${error.message}`);
    return rowToStored(data as ProfileRow);
  }

  // First-time: create.
  const baseSlug = makeProfileSlug(
    input.displayName || (input.email?.split("@")[0] ?? "")
  );
  let slug = baseSlug;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) slug = `${baseSlug}-${nanoid(6).toLowerCase()}`;
    const { data: clash } = await client.database
      .from("profiles")
      .select("user_id")
      .eq("slug", slug)
      .limit(1);
    if (!clash || clash.length === 0) break;
  }

  const { data, error } = await client.database
    .from("profiles")
    .insert({
      user_id: input.userId,
      slug,
      display_name: input.displayName || "Unnamed",
      email: input.email,
      profile_image_url: input.profileImageUrl,
    })
    .select("*")
    .single();
  if (error) throw new Error(`ensureProfile (create): ${error.message}`);
  return rowToStored(data as ProfileRow);
}

/* ─── UPDATE ──────────────────────────────────────────────────────────── */

export type ProfileEditable = {
  headline: string | null;
  bio: string | null;
  location: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
};

export async function updateProfileFields(
  userId: string,
  fields: ProfileEditable
): Promise<StoredProfile> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("profiles")
    .update({
      headline: fields.headline,
      bio: fields.bio,
      location: fields.location,
      website_url: fields.websiteUrl,
      linkedin_url: fields.linkedinUrl,
      twitter_url: fields.twitterUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw new Error(`updateProfileFields: ${error.message}`);
  return rowToStored(data as ProfileRow);
}

export async function updateProfilePrivacy(
  userId: string,
  privacy: ProfilePrivacy
): Promise<StoredProfile> {
  const client = getInsforge();
  const { data, error } = await client.database
    .from("profiles")
    .update({
      visibility: privacy.visibility,
      searchable: privacy.searchable,
      show_startups: privacy.showStartups,
      show_fund: privacy.showFund,
      show_email: privacy.showEmail,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw new Error(`updateProfilePrivacy: ${error.message}`);
  return rowToStored(data as ProfileRow);
}

/* ─── SEARCH ─────────────────────────────────────────────────────────── */

export async function searchProfiles(
  query: string,
  limit = 8
): Promise<StoredProfile[]> {
  if (!query.trim()) return [];
  const client = getInsforge();
  const q = `%${escapeIlike(query.trim())}%`;
  const { data, error } = await client.database
    .from("profiles")
    .select("*")
    .ilike("display_name", q)
    .eq("searchable", true)
    .neq("visibility", "hidden")
    .limit(limit);
  if (error) throw new Error(`searchProfiles: ${error.message}`);
  return (data as ProfileRow[]).map(rowToStored);
}

function escapeIlike(s: string): string {
  return s.replace(/([%_])/g, "\\$1");
}

/* ─── BATCH LOOKUP ────────────────────────────────────────────────────── */

/**
 * Map Stack Auth user_ids → StoredProfile. Used to resolve people in
 * conversation lists, audience cards, etc., without N+1 queries.
 */
export async function listProfilesByUserIds(
  userIds: string[]
): Promise<Map<string, StoredProfile>> {
  if (userIds.length === 0) return new Map();
  const client = getInsforge();
  const { data } = await client.database
    .from("profiles")
    .select("*")
    .in("user_id", userIds);
  const map = new Map<string, StoredProfile>();
  for (const r of (data ?? []) as ProfileRow[]) {
    map.set(r.user_id, rowToStored(r));
  }
  return map;
}
