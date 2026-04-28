import { redirect } from "next/navigation";
import { stackServerApp } from "@/stack";
import { ensureProfile } from "@/lib/insforge/profiles";
import { RoleChooser } from "./role-chooser";

export const metadata = {
  title: "Welcome · Laelapx",
};

export const dynamic = "force-dynamic";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ switch?: string }>;
}) {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const sp = await searchParams;
  const isSwitching = sp.switch === "1";

  // First-time + recurring sign-in: lazy-create / refresh the LinkedIn-style
  // profile row keyed by Stack Auth user_id. Idempotent.
  await ensureProfile({
    userId: user.id,
    displayName: user.displayName,
    email: user.primaryEmail,
    profileImageUrl: user.profileImageUrl,
  });

  // If a role is already saved AND the user isn't explicitly switching, fast-
  // path to the right home.
  const role = (user.clientReadOnlyMetadata as { role?: string } | null)?.role;
  if (!isSwitching) {
    if (role === "founder") redirect("/founder");
    if (role === "investor") redirect("/funder");
  }

  return (
    <RoleChooser
      displayName={user.displayName}
      email={user.primaryEmail}
      profileImageUrl={user.profileImageUrl}
      currentRole={(role as "founder" | "investor" | undefined) ?? null}
    />
  );
}
