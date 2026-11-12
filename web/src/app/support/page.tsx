import { stackServerApp } from "@/stack";
import { getFounderEntitlement } from "@/lib/billing/entitlements";
import { listSupportThread, markSupportRead } from "@/lib/insforge/founder-tools";
import { SupportView } from "./support-client";

export const metadata = { title: "Support · Laelapx" };
export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const ent = await getFounderEntitlement(user.id);
  const allowed = ent.plan.features.asyncSupport;

  const messages = allowed ? await listSupportThread(user.id) : [];
  if (allowed && messages.some((m) => m.fromTeam && !m.readByFounder)) {
    await markSupportRead(user.id, "founder");
  }

  return (
    <SupportView
      firstName={user.displayName?.split(" ")[0] || "you"}
      profileImageUrl={user.profileImageUrl}
      planBadge={{ name: ent.plan.name, tone: ent.isPaid ? "paid" : "neutral" }}
      allowed={allowed}
      messages={messages.map((m) => ({ id: m.id, fromTeam: m.fromTeam, body: m.body, createdAt: m.createdAt }))}
    />
  );
}
