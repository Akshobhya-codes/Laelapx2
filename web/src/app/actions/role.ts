"use server";

import { redirect } from "next/navigation";
import { stackServerApp } from "@/stack";

export type Role = "founder" | "investor";

export async function chooseRoleAction(role: Role): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  await user.update({
    clientReadOnlyMetadata: {
      ...(user.clientReadOnlyMetadata ?? {}),
      role,
    },
  });
  redirect(role === "founder" ? "/founder" : "/funder");
}
