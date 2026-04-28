import Link from "next/link";
import { stackServerApp } from "@/stack";
import { listConversationsForUser } from "@/lib/insforge/messages";
import {
  MessagesNav,
  ConversationList,
} from "@/components/messages/messages-shell";

export const metadata = { title: "Messages · Laelapx" };
export const dynamic = "force-dynamic";

export default async function MessagesIndexPage() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  const conversations = await listConversationsForUser(user.id);
  const firstName = user.displayName?.split(" ")[0] || "you";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <MessagesNav firstName={firstName} profileImageUrl={user.profileImageUrl} />

      <main className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-[360px_1fr] lg:gap-0">
        {/* Left: conversation list */}
        <aside className="border-r border-ink/8 lg:min-h-[calc(100vh-65px)] lg:border-r">
          <div className="border-b border-ink/8 px-5 py-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue mb-1">
              Inbox
            </div>
            <h1 className="text-[24px] font-extrabold tracking-tight text-navy">
              Messages
            </h1>
          </div>
          <ConversationList conversations={conversations} />
        </aside>

        {/* Right: empty state (no thread selected) */}
        <section className="hidden items-center justify-center px-6 py-20 lg:flex">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-ink/10 bg-white text-[24px] text-blue">
              💬
            </div>
            <h2 className="text-[26px] font-extrabold tracking-tight text-navy">
              {conversations.length === 0
                ? "Nothing here yet."
                : "Pick a conversation."}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
              {conversations.length === 0 ? (
                <>
                  Conversations start automatically when an investor&apos;s
                  connect request is accepted. Visit{" "}
                  <Link href="/funder/discover" className="font-bold text-blue">
                    Discover
                  </Link>{" "}
                  to send one.
                </>
              ) : (
                "Click any conversation on the left to open it. Both sides see messages live."
              )}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
