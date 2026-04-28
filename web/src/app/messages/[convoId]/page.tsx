import { notFound } from "next/navigation";
import { stackServerApp } from "@/stack";
import {
  listConversationsForUser,
  getConversation,
  listMessages,
  describeOtherParty,
} from "@/lib/insforge/messages";
import {
  MessagesNav,
  ConversationList,
} from "@/components/messages/messages-shell";
import { ConversationThread } from "@/components/messages/conversation-thread";

type Params = { convoId: string };

export const metadata = { title: "Conversation · Laelapx" };
export const dynamic = "force-dynamic";

export default async function ConversationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const { convoId } = await params;

  const convo = await getConversation(convoId);
  if (!convo) notFound();
  if (convo.founderUserId !== user.id && convo.investorUserId !== user.id) {
    notFound();
  }

  const [conversations, messages, other] = await Promise.all([
    listConversationsForUser(user.id),
    listMessages(convoId),
    describeOtherParty({ conversation: convo, viewerUserId: user.id }),
  ]);

  const firstName = user.displayName?.split(" ")[0] || "you";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <MessagesNav firstName={firstName} profileImageUrl={user.profileImageUrl} />

      <main className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-[360px_1fr] lg:gap-0">
        {/* Conversation list (hidden on mobile when a thread is open) */}
        <aside className="hidden border-r border-ink/8 lg:block lg:min-h-[calc(100vh-65px)]">
          <div className="border-b border-ink/8 px-5 py-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue mb-1">
              Inbox
            </div>
            <h1 className="text-[24px] font-extrabold tracking-tight text-navy">
              Messages
            </h1>
          </div>
          <ConversationList conversations={conversations} activeId={convo.id} />
        </aside>

        {/* Thread */}
        <section className="lg:min-h-[calc(100vh-65px)]">
          <div
            style={{ height: "calc(100vh - 65px)" }}
            className="flex flex-col"
          >
            <ConversationThread
              conversationId={convo.id}
              initialMessages={messages}
              viewerUserId={user.id}
              otherDisplayName={other.otherDisplayName}
              otherSubtitle={other.otherSubtitle}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
