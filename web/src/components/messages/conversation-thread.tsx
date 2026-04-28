"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { fetchMessagesAction } from "@/app/actions/messages";
import { sendMessageAction } from "@/app/actions/investor";
import type { StoredMessage } from "@/lib/insforge/messages";

const POLL_MS = 4_000;

export function ConversationThread({
  conversationId,
  initialMessages,
  viewerUserId,
  otherDisplayName,
  otherSubtitle,
}: {
  conversationId: string;
  initialMessages: StoredMessage[];
  viewerUserId: string;
  otherDisplayName: string;
  otherSubtitle: string | null;
}) {
  const [messages, setMessages] = useState<StoredMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages.
  useLayoutEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Poll for new messages every POLL_MS.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetchMessagesAction(conversationId);
        if (cancelled) return;
        // Update only if there are changes (avoid pointless re-renders).
        setMessages((cur) => {
          if (
            cur.length === res.messages.length &&
            cur[cur.length - 1]?.id === res.messages[res.messages.length - 1]?.id
          ) {
            return cur;
          }
          return res.messages;
        });
      } catch {
        // soft-fail
      }
    };
    const id = setInterval(tick, POLL_MS);
    // initial tick: marks as read
    tick();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [conversationId]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    // Optimistic append.
    const optimistic: StoredMessage = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderUserId: viewerUserId,
      body,
      readByRecipient: false,
      sentAt: new Date().toISOString(),
    };
    setMessages((cur) => [...cur, optimistic]);
    setDraft("");
    startSending(async () => {
      try {
        await sendMessageAction(conversationId, body);
        // Refresh to swap optimistic with real id.
        const res = await fetchMessagesAction(conversationId);
        setMessages(res.messages);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Send failed — please try again."
        );
        // Roll back optimistic.
        setMessages((cur) => cur.filter((m) => m.id !== optimistic.id));
        setDraft(body);
      }
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full flex-col bg-paper">
      {/* Thread header */}
      <header className="flex items-center justify-between border-b border-ink/8 bg-paper-2 px-6 py-4">
        <div className="min-w-0">
          <div className="truncate text-[18px] font-extrabold tracking-tight text-navy">
            {otherDisplayName}
          </div>
          {otherSubtitle && (
            <div className="truncate text-[12px] text-ink-soft">
              {otherSubtitle}
            </div>
          )}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
          End-to-end via Laelapx
        </div>
      </header>

      {/* Message list */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.length === 0 ? (
            <EmptyThread />
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m, i) => {
                const mine = m.senderUserId === viewerUserId;
                const prev = messages[i - 1];
                const groupedWithPrev =
                  prev && prev.senderUserId === m.senderUserId &&
                  new Date(m.sentAt).getTime() -
                    new Date(prev.sentAt).getTime() <
                    60_000;
                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className={clsx(
                      "flex flex-col",
                      mine ? "items-end" : "items-start",
                      groupedWithPrev ? "mt-0.5" : "mt-3"
                    )}
                  >
                    <div
                      className={clsx(
                        "max-w-[75%] rounded-2xl px-4 py-2.5 text-[14px] leading-[1.45]",
                        mine
                          ? "bg-navy text-white"
                          : "bg-white border border-ink/10 text-ink"
                      )}
                    >
                      {m.body}
                    </div>
                    {!groupedWithPrev && (
                      <div
                        className={clsx(
                          "mt-1 text-[10px] uppercase tracking-[0.15em]",
                          mine ? "text-ink-faint" : "text-ink-faint"
                        )}
                      >
                        {timeOnly(m.sentAt)}
                        {mine && m.readByRecipient && (
                          <span className="ml-2 text-blue">· Read</span>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-ink/8 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-end gap-3">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message…  (Shift+Enter for newline)"
            rows={1}
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-ink/10 bg-paper px-4 py-3 text-[14px] outline-none transition-all focus:border-blue focus:ring-4 focus:ring-blue/15"
          />
          <motion.button
            type="button"
            onClick={send}
            disabled={isSending || !draft.trim()}
            whileTap={{ scale: 0.96 }}
            className="inline-flex h-[44px] items-center gap-2 rounded-xl bg-navy px-5 text-[13px] font-bold text-white transition-colors hover:bg-blue disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send <span className="text-base">→</span>
          </motion.button>
        </div>
        {error && (
          <div className="mx-auto mt-2 max-w-2xl text-[12px] text-flag-red">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyThread() {
  return (
    <div className="mt-12 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-ink/10 bg-white text-[20px] text-blue">
        💬
      </div>
      <div className="mt-5 text-[16px] font-bold text-ink">
        Conversation started.
      </div>
      <p className="mt-1 text-[13px] text-ink-soft">
        Say hi. Both sides see messages live.
      </p>
    </div>
  );
}

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
