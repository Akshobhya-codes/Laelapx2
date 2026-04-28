import { stackServerApp } from "@/stack";
import { getInvestorByOwner } from "@/lib/insforge/investors";
import { ThesisForm } from "./thesis-form";

export const metadata = { title: "Your thesis · Laelapx" };
export const dynamic = "force-dynamic";

export default async function ThesisPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const existing = await getInvestorByOwner(user.id);
  return (
    <ThesisForm
      displayName={user.displayName}
      profileImageUrl={user.profileImageUrl}
      defaults={
        existing
          ? {
              fundName: existing.data.fundName,
              partnerName: existing.data.partnerName ?? "",
              partnerTitle: existing.data.partnerTitle ?? "",
              hq: existing.data.hq ?? "",
              thesisOneLiner: existing.data.thesisOneLiner,
              stages: existing.data.stages,
              sectors: existing.data.sectors,
              checkSizeMinUsd: existing.data.checkSizeMinUsd,
              checkSizeMaxUsd: existing.data.checkSizeMaxUsd,
              notablePortfolio:
                existing.data.notablePortfolio?.join(", ") ?? "",
              websiteUrl: existing.data.websiteUrl ?? "",
            }
          : null
      }
    />
  );
}
