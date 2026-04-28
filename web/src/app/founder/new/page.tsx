import { stackServerApp } from "@/stack";
import { SubmissionForm } from "@/components/submission/submission-form";
import { listSubmissionsByOwner } from "@/lib/insforge/submissions";
import { DUMMY_SUBMISSION, EMPTY_SUBMISSION } from "@/lib/submission/dummy";

export const metadata = {
  title: "New submission · Laelapx",
};

export const dynamic = "force-dynamic";

export default async function NewSubmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; blank?: string }>;
}) {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const sp = await searchParams;

  // Multi-project UX: prefill with the Threadline dummy for first-time founders
  // (so they can click through end-to-end), but show a blank form for users who
  // already have submissions. Force either with ?demo=1 or ?blank=1.
  let useDummy: boolean;
  if (sp.demo === "1") useDummy = true;
  else if (sp.blank === "1") useDummy = false;
  else {
    const existing = await listSubmissionsByOwner(user.id);
    useDummy = existing.length === 0;
  }

  return (
    <SubmissionForm
      mode="create"
      defaultValues={useDummy ? DUMMY_SUBMISSION : EMPTY_SUBMISSION}
    />
  );
}
