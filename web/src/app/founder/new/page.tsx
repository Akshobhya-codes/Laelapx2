import { stackServerApp } from "@/stack";
import { SubmissionForm } from "@/components/submission/submission-form";

export const metadata = {
  title: "New submission · Laelapx",
};

export const dynamic = "force-dynamic";

export default async function NewSubmissionPage() {
  await stackServerApp.getUser({ or: "redirect" });
  return <SubmissionForm mode="create" />;
}
