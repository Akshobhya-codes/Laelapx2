"use server";

import { redirect } from "next/navigation";
import { stackServerApp } from "@/stack";
import { upsertInvestor } from "@/lib/insforge/investors";
import type { ThesisInput } from "@/lib/investors/thesis-schema";

export async function saveThesisAction(input: ThesisInput): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });

  const notablePortfolio = input.notablePortfolio
    ? input.notablePortfolio
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  await upsertInvestor(
    {
      fundName: input.fundName,
      partnerName: input.partnerName,
      partnerTitle: input.partnerTitle,
      hq: input.hq,
      thesisOneLiner: input.thesisOneLiner,
      stages: input.stages,
      sectors: input.sectors,
      checkSizeMinUsd: input.checkSizeMinUsd,
      checkSizeMaxUsd: input.checkSizeMaxUsd,
      notablePortfolio,
      websiteUrl: input.websiteUrl || undefined,
    },
    user.id
  );

  redirect("/funder");
}
