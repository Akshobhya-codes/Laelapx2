import "server-only";
import { getInsforge } from "./client";

/**
 * app_users (migration 0011): an internal mirror of every Stack Auth account.
 * See db/0011-app-users.sql for how it's kept complete.
 */

/** The subset of a Stack Auth server user we mirror. Structural so both
 *  `getUser()` results and `listUsers()` items fit. */
type StackUserLike = {
  id: string;
  primaryEmail: string | null;
  primaryEmailVerified: boolean;
  displayName: string | null;
  profileImageUrl: string | null;
  signedUpAt: Date;
  lastActiveAt?: Date;
  hasPassword: boolean;
  oauthProviders: readonly { id: string }[];
  clientReadOnlyMetadata: unknown;
};

export type AppUser = {
  userId: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  role: "founder" | "investor" | null;
  authMethods: string[];
  signedUpAt: string | null;
  lastActiveAt: string | null;
  deletedAt: string | null;
};

/** Every recorded account, newest sign-up first. For the admin Sign-ups tab. */
export async function listAppUsers(): Promise<AppUser[]> {
  const { data, error } = await getInsforge()
    .database.from("app_users")
    .select("*")
    .order("signed_up_at", { ascending: false });
  if (error) throw new Error(`listAppUsers: ${error.message}`);
  type Row = {
    user_id: string;
    email: string | null;
    email_verified: boolean;
    display_name: string | null;
    role: AppUser["role"];
    auth_methods: string[] | null;
    signed_up_at: string | null;
    last_active_at: string | null;
    deleted_at: string | null;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    userId: r.user_id,
    email: r.email,
    emailVerified: r.email_verified,
    displayName: r.display_name,
    role: r.role,
    authMethods: r.auth_methods ?? [],
    signedUpAt: r.signed_up_at,
    lastActiveAt: r.last_active_at,
    deletedAt: r.deleted_at,
  }));
}

function roleOf(meta: unknown): "founder" | "investor" | null {
  const role = (meta as { role?: unknown } | null)?.role;
  return role === "founder" || role === "investor" ? role : null;
}

/**
 * Insert or refresh the app_users row for a Stack Auth user. Soft-fails:
 * a write problem here must never block sign-in, so errors are logged only.
 * `first_seen_at` is omitted from the payload, so it keeps its value from the
 * first insert.
 */
export async function recordAppUser(
  user: StackUserLike,
  /** Use when the role was just changed and `user` may still hold the old metadata. */
  overrides: { role?: "founder" | "investor" } = {}
): Promise<void> {
  const authMethods = [
    ...(user.hasPassword ? ["password"] : []),
    ...user.oauthProviders.map((p) => p.id),
  ];
  try {
    const { error } = await getInsforge()
      .database.from("app_users")
      .upsert(
        {
          user_id: user.id,
          email: user.primaryEmail,
          email_verified: user.primaryEmailVerified,
          display_name: user.displayName,
          profile_image_url: user.profileImageUrl,
          role: overrides.role ?? roleOf(user.clientReadOnlyMetadata),
          auth_methods: authMethods,
          signed_up_at: user.signedUpAt.toISOString(),
          last_active_at: (user.lastActiveAt ?? new Date()).toISOString(),
          last_synced_at: new Date().toISOString(),
          deleted_at: null,
        },
        { onConflict: "user_id" }
      );
    if (error) console.error("[app_users] upsert failed:", error.message);
  } catch (err) {
    console.error("[app_users] upsert failed:", err);
  }
}
