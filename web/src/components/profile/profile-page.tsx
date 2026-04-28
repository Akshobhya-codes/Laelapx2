"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal } from "@/components/motion/reveal";
import { formatUsdShort } from "@/components/motion/animated-number";
import type { StoredProfile } from "@/lib/insforge/profiles";

export type StartupSummary = {
  slug: string;
  companyName: string;
  oneLiner: string;
  stage: string;
  raisingUsd: number;
  roundType: string;
  productStage: string;
  launched: boolean;
};

export type InvestorSummary = {
  slug: string;
  fundName: string;
  thesisOneLiner: string;
  partnerName: string | null;
  partnerTitle: string | null;
  hq: string | null;
  stages: string[];
  sectors: string[];
};

export function ProfilePage({
  profile,
  startups,
  investor,
  isOwner,
}: {
  profile: StoredProfile;
  startups: StartupSummary[];
  investor: InvestorSummary | null;
  isOwner: boolean;
}) {
  const initials = (profile.displayName || "··")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="bg-paper text-ink">
      {/* Top nav */}
      <nav className="fixed top-0 left-0 right-0 z-30 border-b border-white/8 bg-navy/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="text-[14px] font-black tracking-tight text-white"
          >
            Laelapx<span className="text-blue-light">.</span>
            <span className="ml-2 text-[12px] font-semibold text-white/40">
              / {profile.displayName}
            </span>
          </Link>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-light">
            Profile
          </span>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative bg-navy px-6 pt-32 pb-20 text-white"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-end gap-5"
            >
              {profile.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profileImageUrl}
                  alt={profile.displayName}
                  className="h-24 w-24 flex-shrink-0 rounded-2xl border-2 border-white/15 bg-white object-cover"
                />
              ) : (
                <div className="grid h-24 w-24 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-light to-blue text-[28px] font-black text-white">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-light mb-2">
                  Person
                </div>
                <h1 className="text-[clamp(40px,6vw,68px)] font-extrabold leading-[1.05] tracking-[-0.035em]">
                  {profile.displayName}
                </h1>
                {profile.headline && (
                  <p className="mt-2 text-[clamp(15px,1.6vw,18px)] text-white/70 leading-snug">
                    {profile.headline}
                  </p>
                )}
                {profile.location && (
                  <p className="mt-1 text-[12px] uppercase tracking-[0.2em] text-white/45">
                    {profile.location}
                  </p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="flex items-center gap-3"
            >
              {isOwner ? (
                <Link
                  href="/u/me/edit"
                  className="rounded-md bg-white px-4 py-2 text-[13px] font-bold text-navy transition-transform hover:-translate-y-0.5"
                >
                  Edit profile
                </Link>
              ) : null}
            </motion.div>
          </div>

          {/* Social row */}
          {(profile.websiteUrl ||
            profile.linkedinUrl ||
            profile.twitterUrl ||
            (profile.privacy.showEmail && profile.email)) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]"
            >
              {profile.websiteUrl && (
                <SocialLink href={profile.websiteUrl}>Website ↗</SocialLink>
              )}
              {profile.linkedinUrl && (
                <SocialLink href={profile.linkedinUrl}>LinkedIn ↗</SocialLink>
              )}
              {profile.twitterUrl && (
                <SocialLink href={profile.twitterUrl}>Twitter ↗</SocialLink>
              )}
              {profile.privacy.showEmail && profile.email && (
                <SocialLink href={`mailto:${profile.email}`}>
                  {profile.email}
                </SocialLink>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* Bio */}
      {profile.bio && (
        <SectionFrame
          num="01"
          eyebrow="About"
          bg="paper"
          ink="ink"
        >
          <Reveal delay={0.05}>
            <p className="max-w-3xl text-[clamp(16px,1.6vw,20px)] leading-[1.65] text-ink-soft whitespace-pre-line">
              {profile.bio}
            </p>
          </Reveal>
        </SectionFrame>
      )}

      {/* Startups */}
      {profile.privacy.showStartups && startups.length > 0 && (
        <SectionFrame
          num={profile.bio ? "02" : "01"}
          eyebrow="Building"
          bg="paper-2"
          ink="ink"
        >
          <Reveal delay={0.05}>
            <h2 className="text-[clamp(28px,3.6vw,42px)] font-extrabold tracking-tight text-navy">
              {startups.length === 1
                ? "The startup."
                : `${startups.length} startups.`}
            </h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {startups.map((s, i) => (
              <Reveal key={s.slug} delay={0.05 + i * 0.06}>
                <StartupCard s={s} />
              </Reveal>
            ))}
          </div>
        </SectionFrame>
      )}

      {/* Investor profile (if they have one) */}
      {profile.privacy.showFund && investor && (
        <SectionFrame
          num={
            profile.bio
              ? profile.privacy.showStartups && startups.length > 0
                ? "03"
                : "02"
              : profile.privacy.showStartups && startups.length > 0
              ? "02"
              : "01"
          }
          eyebrow="Investing as"
          bg="navy"
          ink="white"
        >
          <Reveal delay={0.05}>
            <Link href={`/v/${investor.slug}`} className="block group">
              <div className="text-[14px] font-semibold text-white/55">
                {investor.partnerName
                  ? `${investor.partnerName} · ${investor.partnerTitle ?? ""}`
                  : "Partner"}
              </div>
              <div className="mt-1 text-[clamp(36px,5vw,60px)] font-extrabold leading-tight tracking-[-0.025em] group-hover:text-blue-light">
                {investor.fundName}
                <span className="text-blue-light">.</span>
              </div>
              <p className="mt-4 max-w-2xl text-[16px] italic leading-[1.5] text-white/75">
                &ldquo;{investor.thesisOneLiner}&rdquo;
              </p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {investor.stages.map((st) => (
                  <span
                    key={st}
                    className="rounded-md bg-blue-light/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-light"
                  >
                    {st}
                  </span>
                ))}
                {investor.sectors.slice(0, 6).map((sc) => (
                  <span
                    key={sc}
                    className="rounded-md bg-white/8 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55"
                  >
                    {sc}
                  </span>
                ))}
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-[13px] font-bold text-blue-light transition-colors group-hover:text-white">
                Open fund profile →
              </div>
            </Link>
          </Reveal>
        </SectionFrame>
      )}

      <footer className="border-t border-ink/8 bg-paper-2 px-6 py-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="text-[12px] text-ink-faint">
            {profile.displayName} · u/{profile.slug}
          </div>
          <Link
            href="/"
            className="text-[12px] font-bold text-ink-soft transition-colors hover:text-ink"
          >
            Verified by Laelapx<span className="text-blue">.</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ─── HIDDEN STATE ────────────────────────────────────────────────────── */
export function HiddenProfile({ displayName }: { displayName: string }) {
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <nav className="border-b border-ink/8 bg-paper/85 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="text-[16px] font-black tracking-tight text-navy">
            Laelapx<span className="text-blue">.</span>
          </Link>
        </div>
      </nav>
      <main className="mx-auto flex max-w-md flex-col items-center px-6 py-32 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-2xl border border-ink/10 bg-white text-[28px] font-black text-ink-faint">
          {initials}
        </div>
        <h1 className="mt-7 text-[28px] font-extrabold tracking-tight text-navy">
          {displayName}
        </h1>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-paper-2 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
          🔒 Private profile
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
          This person has set their profile to private. Only their name is
          visible.
        </p>
      </main>
    </div>
  );
}

/* ─── HELPERS ─────────────────────────────────────────────────────────── */
function SocialLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/80 transition-colors hover:border-white/35 hover:text-white"
    >
      {children}
    </a>
  );
}

function SectionFrame({
  num,
  eyebrow,
  bg,
  ink,
  children,
}: {
  num: string;
  eyebrow: string;
  bg: "paper" | "paper-2" | "navy";
  ink: "ink" | "white";
  children: React.ReactNode;
}) {
  const bgCls =
    bg === "navy" ? "bg-navy" : bg === "paper-2" ? "bg-paper-2" : "bg-paper";
  const inkCls = ink === "white" ? "text-white" : "text-ink";
  const eyebrowCls = ink === "white" ? "text-blue-light" : "text-blue";
  return (
    <section className={`scroll-mt-20 px-6 py-20 sm:py-28 ${bgCls} ${inkCls}`}>
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div
            className={`mb-3 flex items-baseline gap-3 ${
              ink === "white" ? "text-white/35" : "text-ink-faint"
            }`}
          >
            <span className="text-[14px] font-bold tabular-nums tracking-wide">
              {num}
            </span>
            <span className="h-px w-10 bg-current opacity-40" />
            <span
              className={`text-[11px] font-bold uppercase tracking-[0.22em] ${eyebrowCls}`}
            >
              {eyebrow}
            </span>
          </div>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

function StartupCard({ s }: { s: StartupSummary }) {
  const initials = s.companyName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <Link
        href={`/s/${s.slug}`}
        className="group flex h-full items-start gap-4 rounded-xl border border-ink/10 bg-white p-5 transition-all hover:border-blue/40 hover:shadow-[0_8px_32px_rgba(28,43,66,0.08)]"
      >
        <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue to-navy text-[13px] font-black text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <div className="truncate text-[18px] font-extrabold tracking-tight text-navy group-hover:text-blue">
              {s.companyName}
            </div>
            <span className="flex-shrink-0 rounded bg-blue/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-blue">
              {s.stage}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-soft">
            {s.oneLiner}
          </p>
          <div className="mt-2 text-[11px] uppercase tracking-[0.15em] text-ink-faint">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle ${
                s.launched ? "bg-flag-green" : "bg-flag-amber"
              }`}
            />
            {s.launched ? "Live" : "Pre-launch"} · {s.productStage} · raising{" "}
            {formatUsdShort(s.raisingUsd)} {s.roundType}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
