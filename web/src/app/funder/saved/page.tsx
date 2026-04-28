import { stackServerApp } from "@/stack";
import { listSavedForInvestor } from "@/lib/insforge/audience";
import { SavedList } from "./saved-list";

export const metadata = { title: "Saved · Laelapx" };
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const saves = await listSavedForInvestor(user.id);
  return (
    <SavedList
      displayName={user.displayName}
      profileImageUrl={user.profileImageUrl}
      saves={saves}
    />
  );
}
