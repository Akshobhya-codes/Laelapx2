"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import {
  toggleSaveAction,
  requestConnectAction,
} from "@/app/actions/investor";

export function StartupActionBar({
  slug,
  companyName,
  initialSaved,
  initialConnectPending,
  isOwner = false,
}: {
  slug: string;
  companyName: string;
  initialSaved: boolean;
  initialConnectPending: boolean;
  isOwner?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [connectPending, setConnectPending] = useState(initialConnectPending);
  const [isSavingPending, startSavingTransition] = useTransition();
  const [showConnect, setShowConnect] = useState(false);

  const onToggleSave = () => {
    startSavingTransition(async () => {
      try {
        const { saved: next } = await toggleSaveAction(slug);
        setSaved(next);
      } catch {
        // no-op for now; could surface an error toast
      }
    });
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-navy/90 p-1.5 shadow-[0_12px_40px_rgba(28,43,66,0.4)] backdrop-blur-md"
        >
          <span
            className={clsx(
              "ml-3 text-[11px] font-bold uppercase tracking-[0.2em]",
              isOwner ? "text-flag-amber" : "text-white/50"
            )}
          >
            {isOwner ? "Test mode · your own startup" : "Investor"}
          </span>

          <motion.button
            type="button"
            onClick={onToggleSave}
            disabled={isSavingPending}
            whileTap={{ scale: 0.95 }}
            className={clsx(
              "flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold transition-colors",
              saved
                ? "bg-blue-light text-navy"
                : "bg-white/10 text-white hover:bg-white/15"
            )}
          >
            <span className="text-base leading-none">{saved ? "★" : "☆"}</span>
            {saved ? "Saved" : "Save"}
          </motion.button>

          <motion.button
            type="button"
            onClick={() => setShowConnect(true)}
            disabled={connectPending}
            whileTap={{ scale: 0.95 }}
            className={clsx(
              "flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold transition-colors",
              connectPending
                ? "bg-white/10 text-white/55 cursor-not-allowed"
                : "bg-white text-navy hover:bg-blue-light"
            )}
          >
            {connectPending ? "Connect requested ✓" : "Request connect →"}
          </motion.button>
        </motion.div>
      </div>

      <AnimatePresence>
        {showConnect && (
          <ConnectModal
            slug={slug}
            companyName={companyName}
            onClose={() => setShowConnect(false)}
            onSent={() => {
              setConnectPending(true);
              setShowConnect(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ─── CONNECT MODAL ────────────────────────────────────────────────── */
function ConnectModal({
  slug,
  companyName,
  onClose,
  onSent,
}: {
  slug: string;
  companyName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = () => {
    setError(null);
    startTransition(async () => {
      try {
        await requestConnectAction(slug, message);
        onSent();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed");
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 px-5 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="bg-navy px-7 py-6 text-white">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-light">
            Request connect
          </div>
          <div className="mt-1 text-[20px] font-extrabold tracking-tight">
            Reach out to {companyName}
          </div>
        </div>
        <div className="p-7">
          <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-ink-soft">
            Short message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="One line on why you'd be a fit. We&apos;ll attach your thesis automatically."
            className="w-full rounded-md border border-ink/10 bg-paper px-3.5 py-3 text-[14px] outline-none transition-all focus:border-blue focus:ring-4 focus:ring-blue/15"
          />
          <div className="mt-1 text-right text-[11px] text-ink-faint">
            {message.length} / 500
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-flag-red/30 bg-flag-red/8 p-3 text-[13px] text-flag-red">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-[13px] font-semibold text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
            <motion.button
              type="button"
              onClick={onSubmit}
              disabled={isPending}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-blue disabled:opacity-60"
            >
              {isPending ? "Sending…" : "Send request"}
              <span className="text-base">→</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
