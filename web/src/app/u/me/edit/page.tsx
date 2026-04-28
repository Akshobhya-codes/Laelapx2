import { stackServerApp } from "@/stack";
import { ensureProfile } from "@/lib/insforge/profiles";
import { ProfileEditor } from "./profile-editor";

export const metadata = { title: "Edit profile · Laelapx" };
export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const profile = await ensureProfile({
    userId: user.id,
    displayName: user.displayName,
    email: user.primaryEmail,
    profileImageUrl: user.profileImageUrl,
  });
  return <ProfileEditor profile={profile} />;
}
