"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { stackServerApp } from "@/stack";
import {
  createSubmission,
  updateSubmission,
  getSubmissionBySlug,
} from "@/lib/insforge/submissions";
import type { Submission } from "@/lib/submission/schema";

/**
 * Persist a new submission to Insforge and redirect to its company hub.
 * Throws on auth or DB failure — the form catches and surfaces the error.
 */
export async function submitFounderSubmission(data: Submission): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const stored = await createSubmission(data, user.id);
  redirect(`/founder/${stored.slug}`);
}

/**
 * Update an existing submission. Only the owner can update.
 */
export async function updateFounderSubmission(
  slug: string,
  data: Submission
): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const existing = await getSubmissionBySlug(slug);
  if (!existing) throw new Error("Submission not found");
  if (existing.ownerUserId !== user.id) throw new Error("Not authorized");
  await updateSubmission(slug, data, user.id);
  revalidatePath(`/founder/${slug}`);
  revalidatePath(`/s/${slug}`);
  redirect(`/founder/${slug}`);
}
