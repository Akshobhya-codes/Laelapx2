"use client";

import { motion } from "framer-motion";

/**
 * The Laelapx logo, rotating like a waiting cursor. Used inside Suspense
 * fallbacks for any block that's streaming server-side work (e.g. the
 * external funds web-search pipeline).
 */
export function LogoSpinner({
  size = 56,
  label,
}: {
  size?: number;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {/* Soft pulsing halo behind the mark — gives it depth + a "live" feel
            without competing with the rotation itself. */}
        <motion.div
          className="absolute inset-0 rounded-full bg-blue/15 blur-xl"
          animate={{ scale: [0.85, 1.1, 0.85], opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* The mark itself — continuous rotation. */}
        <motion.img
          src="/laelapx-logo.png"
          alt=""
          width={size}
          height={size}
          className="relative block select-none"
          draggable={false}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          style={{
            // Pre-tilt the rotation origin and keep the image centered.
            transformOrigin: "50% 50%",
          }}
        />
      </div>
      {label && (
        <motion.div
          className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-faint"
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {label}
        </motion.div>
      )}
    </div>
  );
}
