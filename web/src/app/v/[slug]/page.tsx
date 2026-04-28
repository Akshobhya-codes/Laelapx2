import { notFound } from "next/navigation";
import { getInvestorBySlug } from "@/lib/insforge/investors";
import { InvestorPage } from "@/components/investor/investor-page";
import type { Metadata } from "next";

type Params = { slug: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const inv = await getInvestorBySlug(slug);
  if (!inv) return { title: "Not found · Laelapx" };
  return {
    title: `${inv.data.fundName} · ${inv.data.thesisOneLiner}`,
    description: inv.data.thesisOneLiner,
    openGraph: {
      title: `${inv.data.fundName} · Laelapx`,
      description: inv.data.thesisOneLiner,
    },
  };
}

export default async function InvestorProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const inv = await getInvestorBySlug(slug);
  if (!inv) notFound();
  return <InvestorPage thesis={inv.data} fundSlug={inv.slug} />;
}
