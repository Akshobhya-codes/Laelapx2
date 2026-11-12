"use server";

import { redirect } from "next/navigation";
import { stackServerApp } from "@/stack";
import { recordAppUser } from "@/lib/insforge/app-users";

export type Role = "founder" | "investor";

export async function chooseRoleAction(role: Role): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  await user.update({
    clientReadOnlyMetadata: {
      ...(user.clientReadOnlyMetadata ?? {}),
      role,
    },
  });
  // Keep the app_users mirror's role current. Soft-fails.
  await recordAppUser(user, { role });
  redirect(role === "founder" ? "/founder" : "/funder");
}
