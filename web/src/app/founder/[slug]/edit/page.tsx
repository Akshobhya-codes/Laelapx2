import { notFound } from "next/navigation";
import { stackServerApp } from "@/stack";
import { getSubmissionBySlug } from "@/lib/insforge/submissions";
import { SubmissionForm } from "@/components/submission/submission-form";

export const metadata = { title: "Edit submission · Laelapx" };
export const dynamic = "force-dynamic";

export default async function EditSubmissionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const { slug } = await params;
  const stored = await getSubmissionBySlug(slug);
  if (!stored) notFound();
  if (stored.ownerUserId !== user.id) notFound();

  return (
    <SubmissionForm
      mode="edit"
      editingSlug={slug}
      defaultValues={stored.data}
    />
  );
}
