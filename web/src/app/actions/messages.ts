"use server";

import { stackServerApp } from "@/stack";
import {
  listMessages,
  markMessagesRead,
  getConversation,
  type StoredMessage,
} from "@/lib/insforge/messages";

/**
 * Polling endpoint for the conversation thread. Returns ALL messages —
 * client de-dupes by id. Cheap because messages are small + indexed.
 */
export async function fetchMessagesAction(
  conversationId: string
): Promise<{ messages: StoredMessage[]; viewerUserId: string }> {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const convo = await getConversation(conversationId);
  if (!convo) throw new Error("Conversation not found");
  if (
    convo.founderUserId !== user.id &&
    convo.investorUserId !== user.id
  ) {
    throw new Error("Not authorized");
  }
  const messages = await listMessages(conversationId);
  // Mark messages from the OTHER party as read whenever the user polls
  // (i.e. they are actively viewing this thread).
  await markMessagesRead(conversationId, user.id);
  return { messages, viewerUserId: user.id };
}
