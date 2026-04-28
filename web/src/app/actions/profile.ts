"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { stackServerApp } from "@/stack";
import {
  ensureProfile,
  updateProfileFields,
  updateProfilePrivacy,
  type ProfileEditable,
  type ProfilePrivacy,
  type StoredProfile,
} from "@/lib/insforge/profiles";

/**
 * Idempotent: ensure the current Stack Auth user has a profile row in our DB.
 * Called from any auth-gated server component that wants to read the profile.
 */
export async function ensureMyProfileAction(): Promise<StoredProfile | null> {
  const user = await stackServerApp.getUser({ or: "return-null" });
  if (!user) return null;
  return ensureProfile({
    userId: user.id,
    displayName: user.displayName,
    email: user.primaryEmail,
    profileImageUrl: user.profileImageUrl,
  });
}

/**
 * Save the editable fields (headline / bio / location / social URLs).
 * Privacy lives in a separate action.
 */
export async function saveProfileFieldsAction(
  fields: ProfileEditable
): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  await updateProfileFields(user.id, fields);
  revalidatePath(`/u/${user.id}`); // by-user-id won't actually match the slug route, harmless
  redirect("/u/me");
}

export async function savePrivacyAction(
  privacy: ProfilePrivacy
): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  await updateProfilePrivacy(user.id, privacy);
  revalidatePath("/u/me");
}
