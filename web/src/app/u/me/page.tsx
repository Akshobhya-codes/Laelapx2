import { redirect } from "next/navigation";
import { stackServerApp } from "@/stack";
import { ensureProfile } from "@/lib/insforge/profiles";

export const dynamic = "force-dynamic";

/**
 * Convenience redirect: /u/me → /u/[currentUserSlug].
 * Lazy-creates the profile if it doesn't exist yet.
 */
export default async function MeRedirectPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const profile = await ensureProfile({
    userId: user.id,
    displayName: user.displayName,
    email: user.primaryEmail,
    profileImageUrl: user.profileImageUrl,
  });
  redirect(`/u/${profile.slug}`);
}
