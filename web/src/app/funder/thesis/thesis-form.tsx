"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import {
  thesisSchema,
  STAGE_OPTIONS,
  SECTORS,
  type ThesisInput,
} from "@/lib/investors/thesis-schema";
import { DUMMY_THESIS } from "@/lib/investors/dummy";
import {
  TextField,
  TextareaField,
  NumberField,
  TagPicker,
} from "@/components/submission/fields";
import { saveThesisAction } from "./actions";

type Defaults = ThesisInput & {
  notablePortfolio: string;
  websiteUrl: string;
};

// First-time investors get the Atlas Ventures dummy pre-filled (matches the
// founder side's Threadline DUMMY_SUBMISSION pattern) — one-click testing.
const EMPTY_DEFAULTS: Defaults = {
  fundName: DUMMY_THESIS.fundName,
  partnerName: DUMMY_THESIS.partnerName,
  partnerTitle: DUMMY_THESIS.partnerTitle ?? "",
  hq: DUMMY_THESIS.hq ?? "",
  thesisOneLiner: DUMMY_THESIS.thesisOneLiner,
  stages: DUMMY_THESIS.stages,
  sectors: DUMMY_THESIS.sectors,
  checkSizeMinUsd: DUMMY_THESIS.checkSizeMinUsd,
  checkSizeMaxUsd: DUMMY_THESIS.checkSizeMaxUsd,
  notablePortfolio: DUMMY_THESIS.notablePortfolio ?? "",
  websiteUrl: DUMMY_THESIS.websiteUrl ?? "",
};

export function ThesisForm({
  displayName,
  profileImageUrl,
  defaults,
}: {
  displayName: string | null;
  profileImageUrl: string | null;
  defaults: Defaults | null;
}) {
  const firstName = displayName?.split(" ")[0] || "you";
  const isEditing = defaults !== null;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const methods = useForm<ThesisInput>({
    resolver: zodResolver(thesisSchema),
    defaultValues: defaults ?? EMPTY_DEFAULTS,
    mode: "onBlur",
  });

  const onSubmit = (data: ThesisInput) => {
    setError(null);
    startTransition(async () => {
      try {
        await saveThesisAction(data);
      } catch (e) {
        if (e && typeof e === "object" && "digest" in e) throw e;
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  return (
    <FormProvider {...methods}>
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
                href="/funder"
                className="text-[12px] font-bold uppercase tracking-[0.15em] text-ink-soft transition-colors hover:text-ink"
              >
                Investor
              </Link>
              <span className="text-ink-faint">/</span>
              <span className="text-[14px] font-extrabold text-navy">Thesis</span>
            </div>
            <div className="flex items-center gap-3">
              {profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileImageUrl}
                  alt={firstName}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-blue text-[10px] font-bold text-white">
                  {firstName[0]?.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-3xl px-6 py-14">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-12"
          >
            <div className="text-[12px] font-bold uppercase tracking-[0.22em] text-blue mb-3">
              {isEditing ? "Edit your thesis" : "Set your thesis"}
            </div>
            <h1 className="text-[clamp(40px,5.5vw,64px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-navy">
              Define what fits.
            </h1>
            <p className="mt-3 max-w-xl text-[16px] text-ink-soft leading-relaxed">
              We use this to filter every incoming submission. Off-thesis
              startups never reach your inbox.
            </p>
          </motion.div>

          <div className="space-y-8">
            <Section title="Fund identity">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <TextField name="fundName" label="Fund name" placeholder="e.g. BoxGroup" />
                <TextField
                  name="partnerName"
                  label="Your name"
                  placeholder="e.g. Adam Rothenberg"
                />
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <TextField
                  name="partnerTitle"
                  label="Your role (optional)"
                  placeholder="e.g. Partner"
                />
                <TextField
                  name="hq"
                  label="HQ (optional)"
                  placeholder="e.g. New York, USA"
                />
              </div>
              <TextField
                name="websiteUrl"
                label="Website (optional)"
                type="url"
                placeholder="https://…"
              />
            </Section>

            <Section title="Thesis">
              <TextareaField
                name="thesisOneLiner"
                label="Thesis one-liner"
                rows={2}
                help="One sentence on what you fund. Founders see this on match cards."
              />
              <TagPicker
                name="stages"
                label="Stages you invest in"
                options={STAGE_OPTIONS}
                help="We'll only surface startups at these stages."
              />
              <TagPicker
                name="sectors"
                label="Sectors / verticals"
                options={SECTORS}
                help="Pick all that fit. Multi-overlap weighs higher in match score."
              />
            </Section>

            <Section title="Check size">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <NumberField
                  name="checkSizeMinUsd"
                  label="Min check (USD)"
                  prefix="$"
                  placeholder="e.g. 250000"
                />
                <NumberField
                  name="checkSizeMaxUsd"
                  label="Max check (USD)"
                  prefix="$"
                  placeholder="e.g. 1500000"
                />
              </div>
            </Section>

            <Section title="Portfolio (optional)">
              <TextField
                name="notablePortfolio"
                label="Notable portfolio companies"
                placeholder="Comma-separated, e.g. Vercel, Plaid, Ramp"
                help="Shown on your investor profile + match cards."
              />
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

          <div className="mt-10 flex items-center justify-between border-t border-ink/8 pt-6">
            <Link
              href="/funder"
              className="text-[14px] font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              ← Cancel
            </Link>
            <motion.button
              type="button"
              onClick={methods.handleSubmit(onSubmit)}
              disabled={isPending}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-md bg-navy px-7 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-blue disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending
                ? "Saving…"
                : isEditing
                ? "Update thesis"
                : "Save thesis"}
              <span className="text-base">→</span>
            </motion.button>
          </div>
        </main>
      </div>
    </FormProvider>
  );
}

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
      <div className="space-y-6">{children}</div>
    </section>
  );
}
