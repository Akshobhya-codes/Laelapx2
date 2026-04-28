"use client";

import { useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { chooseRoleAction, type Role } from "@/app/actions/role";

export function RoleChooser({
  displayName,
  email,
  profileImageUrl,
  currentRole,
}: {
  displayName: string | null;
  email: string | null;
  profileImageUrl: string | null;
  currentRole?: Role | null;
}) {
  const firstName = displayName?.split(" ")[0] || "there";
  const [isPending, startTransition] = useTransition();
  const pickRole = (role: Role) => {
    startTransition(async () => {
      try {
        await chooseRoleAction(role);
      } catch (e) {
        if (e && typeof e === "object" && "digest" in e) throw e; // re-throw redirect
        // soft-fail: nothing else to do here
      }
    });
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-navy text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
        backgroundSize: "56px 56px",
      }}
    >
      {/* Top bar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <Link href="/" className="text-[16px] font-black tracking-tight">
          Laelapx<span className="text-blue-light">.</span>
        </Link>
        <div className="flex items-center gap-3">
          {profileImageUrl ? (
            // Plain <img> avoids next/image domain allowlisting for Google avatars.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileImageUrl}
              alt={displayName || "you"}
              width={28}
              height={28}
              className="h-7 w-7 rounded-full border border-white/20"
            />
          ) : (
            <div className="grid h-7 w-7 place-items-center rounded-full bg-blue text-[11px] font-bold">
              {firstName[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-[12px] text-white/55">{email}</span>
          <Link
            href="/handler/sign-out"
            className="ml-2 text-[12px] font-semibold text-white/45 transition-colors hover:text-white"
          >
            Sign out
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-16 pb-24 text-center sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-light"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-light opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-light" />
          </span>
          Signed in
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-[clamp(48px,8vw,96px)] font-extrabold leading-[1.02] tracking-[-0.04em]"
        >
          Welcome,
          <br />
          <span className="text-blue-light">{firstName}.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-xl text-[clamp(16px,1.7vw,20px)] leading-[1.55] text-white/60"
        >
          Pick how you&apos;ll use Laelapx. You can switch between roles later
          from your account.
        </motion.p>

        {currentRole && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="mt-8 text-[12px] text-white/55"
          >
            Currently signed in as a{" "}
            <span className="font-bold text-blue-light">{currentRole}</span>.
            Pick again to switch.
          </motion.div>
        )}

        {/* Choice cards */}
        <div className="mt-14 grid w-full max-w-4xl grid-cols-1 gap-5 md:grid-cols-2">
          <RoleCard
            onClick={() => pickRole("founder")}
            disabled={isPending}
            highlighted={currentRole === "founder"}
            delay={0.45}
            tone="blue"
            label="Founder"
            headline="I'm building a startup"
            sublines={[
              "Submit your company.",
              "Get a Fundability Snapshot.",
              "Reach matched investors.",
            ]}
            cta="Continue as a founder"
          />
          <RoleCard
            onClick={() => pickRole("investor")}
            disabled={isPending}
            highlighted={currentRole === "investor"}
            delay={0.55}
            tone="white"
            label="Investor"
            headline="I'm investing in startups"
            sublines={[
              "Define your thesis once.",
              "See pre-analyzed deal flow.",
              "Skip off-thesis inbound.",
            ]}
            cta="Continue as an investor"
          />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="mt-10 text-[12px] text-white/35"
        >
          Both sides require a subscription · founders see their submissions, investors see filtered deal flow.
        </motion.p>
      </main>

      {/* Decorative orb */}
      <div
        className="pointer-events-none absolute -bottom-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(74,120,204,0.6), transparent)",
        }}
      />
    </div>
  );
}

function RoleCard({
  onClick,
  disabled,
  highlighted,
  delay,
  tone,
  label,
  headline,
  sublines,
  cta,
}: {
  onClick: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  delay: number;
  tone: "blue" | "white";
  label: string;
  headline: string;
  sublines: string[];
  cta: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border p-8 text-left transition-all sm:p-10 disabled:opacity-60 disabled:cursor-not-allowed ${
          tone === "blue"
            ? "border-blue-light/35 bg-gradient-to-br from-blue-light/[0.12] via-blue/[0.05] to-transparent hover:border-blue-light/65"
            : "border-white/15 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.07]"
        } ${highlighted ? "ring-2 ring-blue-light/60" : ""}`}
      >
        <div className="mb-6 inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
          {label}
        </div>

        <h2 className="text-[clamp(26px,3vw,38px)] font-extrabold leading-[1.1] tracking-[-0.025em] text-white">
          {headline}
        </h2>

        <ul className="mt-6 space-y-2.5">
          {sublines.map((line, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-[14px] leading-[1.5] text-white/65"
            >
              <span
                className={`mt-[7px] h-1 w-3 rounded-full ${
                  tone === "blue" ? "bg-blue-light" : "bg-white/40"
                }`}
              />
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center justify-between pt-10">
          <span className="text-[14px] font-bold text-white/85">{cta}</span>
          <motion.span
            whileHover={{ x: 6 }}
            className={`grid h-9 w-9 place-items-center rounded-full ${
              tone === "blue"
                ? "bg-blue-light text-navy"
                : "bg-white/10 text-white group-hover:bg-white group-hover:text-navy"
            } transition-colors`}
          >
            →
          </motion.span>
        </div>

        {/* Subtle hover-glow corner */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-radial opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    </motion.div>
  );
}
