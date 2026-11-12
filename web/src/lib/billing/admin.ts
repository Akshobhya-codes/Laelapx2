import "server-only";
import { stackServerApp } from "@/stack";

/**
 * Who can open /admin: the emails in ADMIN_EMAILS (comma-separated).
 * Unset = nobody, which is the safe default for a fresh environment.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/** Resolve the signed-in user and require admin, or throw. */
export async function requireAdmin() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  if (!isAdminEmail(user.primaryEmail)) {
    throw new Error("Not authorized");
  }
  return user;
}
