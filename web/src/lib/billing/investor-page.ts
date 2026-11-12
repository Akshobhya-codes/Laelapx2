import "server-only";
import { stackServerApp } from "@/stack";
import { getInvestorEntitlement, type InvestorEntitlement } from "./entitlements";
import { getTeamByOwner, listTeamMembers } from "@/lib/insforge/billing";
import { listProfilesByUserIds } from "@/lib/insforge/profiles";

/**
 * Shared setup for investor workspace pages (pipeline, criteria,
 * analytics): the signed-in user, their entitlement, and the nav badge.
 */
export async function loadInvestorPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const ent = await getInvestorEntitlement({ userId: user.id, email: user.primaryEmail });
  return { user, ent, planBadge: investorPlanBadge(ent) };
}

export function investorPlanBadge(ent: InvestorEntitlement): {
  name: string;
  tone: "neutral" | "paid" | "warn";
} {
  if (!ent.active || !ent.plan) {
    return { name: ent.subscription ? "Plan ended" : "No plan", tone: "warn" };
  }
  return {
    name: ent.isTeamMember ? `${ent.plan.name} · team` : ent.plan.name,
    tone: ent.plan.id === "pilot" ? "neutral" : "paid",
  };
}

/** Owner + active teammates, with display names, for assignment and analytics. */
export async function listAccountPeople(
  accountUserId: string
): Promise<{ userId: string; name: string; isOwner: boolean }[]> {
  const team = await getTeamByOwner(accountUserId);
  const members = team ? await listTeamMembers(team.id) : [];
  const ids = Array.from(
    new Set([
      accountUserId,
      ...members.filter((m) => m.status === "active" && m.userId).map((m) => m.userId!),
    ])
  );
  const profiles = await listProfilesByUserIds(ids);
  return ids.map((id) => ({
    userId: id,
    name: profiles.get(id)?.displayName ?? members.find((m) => m.userId === id)?.email ?? "Teammate",
    isOwner: id === accountUserId,
  }));
}
