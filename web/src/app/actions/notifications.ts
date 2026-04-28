"use server";

import { revalidatePath } from "next/cache";
import { stackServerApp } from "@/stack";
import {
  listNotifications,
  countUnread,
  markAllRead,
  markRead,
  type StoredNotification,
} from "@/lib/insforge/notifications";

export async function fetchNotificationsAction(): Promise<{
  notifications: StoredNotification[];
  unread: number;
}> {
  const user = await stackServerApp.getUser({ or: "return-null" });
  if (!user) return { notifications: [], unread: 0 };
  const [notifications, unread] = await Promise.all([
    listNotifications(user.id, 15),
    countUnread(user.id),
  ]);
  return { notifications, unread };
}

export async function markAllReadAction(): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  await markAllRead(user.id);
  revalidatePath("/", "layout");
}

export async function markReadAction(id: string): Promise<void> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  await markRead(id, user.id);
}
