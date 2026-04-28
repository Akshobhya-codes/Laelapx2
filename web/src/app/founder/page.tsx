import { stackServerApp } from "@/stack";
import { FounderHome } from "./founder-home";
import { listSubmissionsByOwner } from "@/lib/insforge/submissions";
import { buildSnapshot } from "@/lib/scoring/rubric";

export const metadata = {
  title: "Your projects · Laelapx",
};

export const dynamic = "force-dynamic";

export default async function FounderHomePage() {
  const user = await stackServerApp.getUser({ or: "redirect" });

  const submissions = await listSubmissionsByOwner(user.id);
  const projects = submissions.map((s) => ({
    slug: s.slug,
    name: s.data.companyName,
    oneLiner: s.data.oneLiner,
    stage: s.data.stage,
    sectors: s.data.sectors.slice(0, 3),
    score: buildSnapshot(s.data).composite,
    productStage: s.data.productStage,
    launched: s.data.launched,
    lastUpdatedRel: relativeTime(s.updatedAt),
  }));

  return (
    <FounderHome
      displayName={user.displayName}
      email={user.primaryEmail}
      profileImageUrl={user.profileImageUrl}
      projects={projects}
    />
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(1, Math.floor((now - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}
