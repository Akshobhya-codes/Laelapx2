"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal } from "@/components/motion/reveal";
import { formatUsdShort } from "@/components/motion/animated-number";
import { FunderNav } from "@/app/funder/discover/discover";

type SavedRow = {
  submissionId: string;
  savedAt: string;
  slug: string;
  companyName: string;
  oneLiner: string;
  stage: string;
  sectors: string[];
  raisingUsd: number;
  roundType: string;
  productStage: string;
  launched: boolean;
  hqCity: string;
  hqCountry: string;
};

export function SavedList({
  displayName,
  profileImageUrl,
  saves,
}: {
  displayName: string | null;
  profileImageUrl: string | null;
  saves: SavedRow[];
}) {
  const firstName = displayName?.split(" ")[0] || "you";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <FunderNav
        firstName={firstName}
        profileImageUrl={profileImageUrl}
        breadcrumb="Saved"
      />

      <header className="border-b border-ink/8 bg-paper-2 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue mb-3">
              Watchlist
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="text-[clamp(40px,5vw,64px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-navy">
              {saves.length === 0 ? (
                "Nothing saved yet."
              ) : (
                <>
                  <span className="text-blue">{saves.length}</span>{" "}
                  saved startup{saves.length === 1 ? "" : "s"}.
                </>
              )}
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-soft">
              Startups you&apos;ve starred from Discover. Most-recently-saved
              first.
            </p>
          </Reveal>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {saves.length === 0 ? (
          <Reveal>
            <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-white p-14 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-ink/10 bg-paper text-[24px] text-flag-amber">
                ★
              </div>
              <div className="mt-5 text-[18px] font-bold text-ink">
                No saves yet.
              </div>
              <p className="mx-auto mt-2 max-w-md text-[14px] text-ink-soft">
                Browse{" "}
                <Link
                  href="/funder/discover"
                  className="font-bold text-blue hover:underline"
                >
                  Discover
                </Link>{" "}
                and click the ★ on any startup to add it to your watchlist.
              </p>
            </div>
          </Reveal>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {saves.map((s, i) => (
              <Reveal key={s.submissionId} delay={i * 0.05}>
                <SavedCard saved={s} />
              </Reveal>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SavedCard({ saved }: { saved: SavedRow }) {
  const initials = saved.companyName
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
        href={`/s/${saved.slug}`}
        className="group flex h-full flex-col rounded-2xl border border-ink/10 bg-white p-6 transition-all hover:border-blue/40 hover:shadow-[0_8px_32px_rgba(28,43,66,0.08)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-blue to-navy text-[15px] font-black text-white">
              {initials}
            </div>
            <div>
              <div className="text-[18px] font-extrabold leading-tight tracking-tight text-navy">
                {saved.companyName}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    saved.launched ? "bg-flag-green" : "bg-flag-amber"
                  }`}
                />
                {saved.launched ? "Live" : "Pre-launch"} · {saved.productStage}
              </div>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-flag-amber">
            ★ Saved {relTime(saved.savedAt)}
          </div>
        </div>

        <p className="mb-5 text-[14px] leading-[1.55] text-ink-soft line-clamp-2">
          {saved.oneLiner}
        </p>

        <div className="mb-5 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-blue/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-blue">
            {saved.stage}
          </span>
          {saved.sectors.slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded-md bg-paper-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint"
            >
              {s}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-ink/8 pt-4">
          <div className="text-[12px] text-ink-faint">
            <span className="font-bold text-ink">
              {formatUsdShort(saved.raisingUsd)}
            </span>{" "}
            · {saved.roundType} · {saved.hqCity}, {saved.hqCountry}
          </div>
          <span className="text-[12px] font-bold text-blue transition-colors group-hover:text-blue-light">
            View →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function relTime(iso: string): string {
  const sec = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
