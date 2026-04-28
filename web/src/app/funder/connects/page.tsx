import { stackServerApp } from "@/stack";
import { listConnectsForInvestor } from "@/lib/insforge/audience";
import { ConnectsList } from "./connects-list";

export const metadata = { title: "Connect requests · Laelapx" };
export const dynamic = "force-dynamic";

export default async function ConnectsPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const connects = await listConnectsForInvestor(user.id);
  return (
    <ConnectsList
      displayName={user.displayName}
      profileImageUrl={user.profileImageUrl}
      connects={connects}
    />
  );
}
