"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";
import {
  saveProfileFieldsAction,
  savePrivacyAction,
} from "@/app/actions/profile";
import type {
  StoredProfile,
  ProfilePrivacy,
} from "@/lib/insforge/profiles";

export function ProfileEditor({ profile }: { profile: StoredProfile }) {
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(profile.websiteUrl ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl ?? "");
  const [twitterUrl, setTwitterUrl] = useState(profile.twitterUrl ?? "");

  const [privacy, setPrivacy] = useState<ProfilePrivacy>(profile.privacy);

  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const saveFields = () => {
    setError(null);
    startTransition(async () => {
      try {
        await saveProfileFieldsAction({
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          location: location.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
          linkedinUrl: linkedinUrl.trim() || null,
          twitterUrl: twitterUrl.trim() || null,
        });
      } catch (e) {
        if (e && typeof e === "object" && "digest" in e) throw e;
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  const savePrivacy = () => {
    setError(null);
    startTransition(async () => {
      try {
        await savePrivacyAction(privacy);
        setSavedAt(Date.now());
      } catch (e) {
        if (e && typeof e === "object" && "digest" in e) throw e;
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Top nav */}
      <nav className="sticky top-0 z-20 border-b border-ink/8 bg-paper/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-[16px] font-black tracking-tight text-navy"
            >
              Laelapx<span className="text-blue">.</span>
            </Link>
            <span className="text-ink-faint">/</span>
            <Link
              href={`/u/${profile.slug}`}
              className="text-[12px] font-bold uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-ink"
            >
              Profile
            </Link>
            <span className="text-ink-faint">/</span>
            <span className="text-[14px] font-extrabold text-navy">Edit</span>
          </div>
          <Link
            href={`/u/${profile.slug}`}
            className="text-[12px] font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            View public profile →
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <div className="text-[12px] font-bold uppercase tracking-[0.22em] text-blue mb-3">
            Edit profile
          </div>
          <h1 className="text-[clamp(36px,5vw,56px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-navy">
            How others see you.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Your name and avatar come from your sign-in. Everything else is
            yours to control.
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* About */}
          <Section title="About">
            <Field label="Headline" hint="One line. Shown next to your name everywhere.">
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={120}
                placeholder="ex-Shopify, building Threadline"
                className={inputCls}
              />
              <Counter value={headline.length} max={120} />
            </Field>

            <Field label="Bio" hint="Longer about. Markdown-friendly line breaks.">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="Where you've been, what you're working on, who you're trying to meet."
                className={clsx(inputCls, "resize-y leading-relaxed")}
              />
              <Counter value={bio.length} max={1000} />
            </Field>

            <Field label="Location">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Brooklyn, USA"
                className={inputCls}
              />
            </Field>
          </Section>

          {/* Links */}
          <Section title="Social">
            <Field label="Personal website">
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://akshobhya.dev"
                className={inputCls}
              />
            </Field>
            <Field label="LinkedIn">
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/…"
                className={inputCls}
              />
            </Field>
            <Field label="Twitter / X">
              <input
                type="url"
                value={twitterUrl}
                onChange={(e) => setTwitterUrl(e.target.value)}
                placeholder="https://x.com/…"
                className={inputCls}
              />
            </Field>
          </Section>

          {/* Save fields */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href={`/u/${profile.slug}`}
              className="text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              Cancel
            </Link>
            <motion.button
              type="button"
              onClick={saveFields}
              disabled={isPending}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-md bg-navy px-6 py-3 text-[13px] font-bold text-white transition-colors hover:bg-blue disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? "Saving…" : "Save profile"}
              <span className="text-base">→</span>
            </motion.button>
          </div>

          {/* Privacy */}
          <Section title="Privacy">
            <p className="text-[13px] leading-relaxed text-ink-soft">
              Control what other Laelapx users see when they visit your
              profile or search for you.
            </p>
            <div className="space-y-3">
              <Toggle
                label="Searchable in global search"
                description="When off, you don't appear in the search dropdown or results page."
                value={privacy.searchable}
                onChange={(v) =>
                  setPrivacy((p) => ({ ...p, searchable: v }))
                }
              />
              <Toggle
                label="Show my startups on profile"
                description="Submissions you own appear in the 'Building' section of your public profile."
                value={privacy.showStartups}
                onChange={(v) =>
                  setPrivacy((p) => ({ ...p, showStartups: v }))
                }
              />
              <Toggle
                label="Show my fund / thesis on profile"
                description="If you have an investor profile, show it as 'Investing as' on your public profile."
                value={privacy.showFund}
                onChange={(v) => setPrivacy((p) => ({ ...p, showFund: v }))}
              />
              <Toggle
                label="Show my email on profile"
                description="Add your email to the public profile so people can reach out off-platform."
                value={privacy.showEmail}
                onChange={(v) => setPrivacy((p) => ({ ...p, showEmail: v }))}
              />

              <div className="rounded-md border border-ink/10 bg-paper-2 p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-soft mb-3">
                  Visibility
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <VisibilityCard
                    selected={privacy.visibility === "public"}
                    onClick={() =>
                      setPrivacy((p) => ({ ...p, visibility: "public" }))
                    }
                    title="Public to subscribers"
                    body="Other signed-in Laelapx users can see your full profile."
                  />
                  <VisibilityCard
                    selected={privacy.visibility === "hidden"}
                    onClick={() =>
                      setPrivacy((p) => ({ ...p, visibility: "hidden" }))
                    }
                    title="Hidden"
                    body="Only your name shows. Used when you want to lurk."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {savedAt && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[12px] text-flag-green"
                  >
                    ✓ Privacy saved
                  </motion.span>
                )}
                <motion.button
                  type="button"
                  onClick={savePrivacy}
                  disabled={isPending}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 rounded-md border border-ink/15 bg-white px-5 py-2.5 text-[13px] font-bold text-ink-soft transition-colors hover:border-blue hover:text-blue disabled:opacity-60"
                >
                  {isPending ? "Saving…" : "Save privacy"}
                </motion.button>
              </div>
            </div>
          </Section>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-md border border-flag-red/30 bg-flag-red/8 p-4 text-[13px] text-flag-red"
          >
            <span className="font-bold">Couldn&apos;t save · </span>
            {error}
          </motion.div>
        )}
      </main>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-ink/10 bg-white px-3.5 py-3 text-[14px] text-ink outline-none transition-all placeholder:text-ink-faint focus:border-blue focus:ring-4 focus:ring-blue/15";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-7">
      <div className="mb-5 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
        {title}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-ink-soft">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 text-[12px] text-ink-faint leading-snug">{hint}</p>
      )}
    </div>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <div className="mt-1 text-right text-[11px] tabular-nums text-ink-faint">
      {value} / {max}
    </div>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-4 rounded-md border border-ink/10 bg-white px-4 py-3 text-left transition-colors hover:border-ink/25"
    >
      <div className="pr-4">
        <div className="text-[13px] font-bold text-ink">{label}</div>
        {description && (
          <div className="mt-0.5 text-[11px] leading-snug text-ink-faint">
            {description}
          </div>
        )}
      </div>
      <span
        className={clsx(
          "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
          value ? "bg-blue" : "bg-ink/15"
        )}
      >
        <motion.span
          animate={{ x: value ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-0.5 left-0 h-5 w-5 rounded-full bg-white shadow-sm"
        />
      </span>
    </button>
  );
}

function VisibilityCard({
  selected,
  onClick,
  title,
  body,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-md border p-4 text-left transition-all",
        selected
          ? "border-blue bg-blue/8 ring-2 ring-blue/30"
          : "border-ink/10 bg-white hover:border-ink/25"
      )}
    >
      <div className="text-[14px] font-bold text-navy">{title}</div>
      <p className="mt-1 text-[12px] leading-snug text-ink-soft">{body}</p>
    </button>
  );
}
