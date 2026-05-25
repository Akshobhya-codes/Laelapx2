"use client";

import { useEffect, useState, useTransition } from "react";
import {
  useForm,
  FormProvider,
  useFieldArray,
  useFormContext,
  type FieldPath,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import {
  submissionSchema,
  STEPS,
  STAGES,
  ROUND_TYPES,
  PRODUCT_STAGES,
  SECTORS,
  type Submission,
} from "@/lib/submission/schema";
import { DUMMY_SUBMISSION, EMPTY_SUBMISSION } from "@/lib/submission/dummy";
import {
  submitFounderSubmission,
  updateFounderSubmission,
} from "@/app/founder/new/actions";
import {
  TextField,
  TextareaField,
  NumberField,
  SelectField,
  TagPicker,
  RadioGroup,
  ToggleField,
} from "./fields";

/* ─── STEP → FIELD MAP (for per-step validation) ──────────────────────── */
const STEP_FIELDS: Record<(typeof STEPS)[number]["id"], FieldPath<Submission>[]> = {
  basics: [
    "companyName",
    "oneLiner",
    "websiteUrl",
    "foundedYear",
    "hqCity",
    "hqCountry",
    "stage",
    "sectors",
  ],
  "problem-solution": [
    "problemDescription",
    "whyNow",
    "solutionDescription",
    "demoVideoUrl",
  ],
  market: [
    "icpDescription",
    "tamUsd",
    "tamReasoning",
    "competitorsAndEdge",
    "defensibility",
  ],
  traction: [
    "productStage",
    "launched",
    "customerCount",
    "mrrUsd",
    "momGrowthPct",
    "milestones",
  ],
  team: ["founders", "whyThisTeam", "teamSize", "advisors"],
  ask: [
    "raisedToDateUsd",
    "raisedFromWhom",
    "raisingUsd",
    "roundType",
    "useOfFunds",
    "targetCloseDate",
    "pitchDeckUrl",
  ],
};

export function SubmissionForm({
  mode = "create",
  defaultValues = EMPTY_SUBMISSION,
  editingSlug,
}: {
  mode?: "create" | "edit";
  defaultValues?: Submission;
  editingSlug?: string;
} = {}) {
  const methods = useForm<Submission>({
    resolver: zodResolver(submissionSchema),
    defaultValues,
    mode: "onBlur",
  });
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEditing = mode === "edit" && !!editingSlug;

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  const next = async () => {
    const ok = await methods.trigger(STEP_FIELDS[step.id], { shouldFocus: true });
    if (!ok) return;
    if (isLast) {
      methods.handleSubmit(onSubmit)();
    } else {
      setDirection(1);
      setStepIdx((i) => i + 1);
    }
  };

  const back = () => {
    setDirection(-1);
    setStepIdx((i) => Math.max(0, i - 1));
  };

  const onSubmit = (data: Submission) => {
    setSubmitError(null);
    startTransition(async () => {
      try {
        if (isEditing && editingSlug) {
          await updateFounderSubmission(editingSlug, data);
        } else {
          await submitFounderSubmission(data);
        }
      } catch (err) {
        // Re-throw Next's redirect signal so navigation completes.
        if (err && typeof err === "object" && "digest" in err) throw err;
        setSubmitError(
          err instanceof Error
            ? err.message
            : "Submission failed. Please try again."
        );
      }
    });
  };

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-paper">
        {/* Top bar */}
        <div className="sticky top-0 z-20 border-b border-ink/8 bg-paper/85 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <div className="text-[16px] font-black tracking-tight text-navy">
              Laelapx<span className="text-blue">.</span>
            </div>
            <div className="flex items-center gap-4">
              {mode === "create" && (
                <button
                  type="button"
                  onClick={() => methods.reset(DUMMY_SUBMISSION)}
                  className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint transition-colors hover:text-blue"
                >
                  Load sample
                </button>
              )}
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                Step {stepIdx + 1} / {STEPS.length} · {step.title}
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-[2px] w-full bg-ink/8">
            <motion.div
              className="h-full bg-blue"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 30 }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto max-w-3xl px-6 py-14">
          {/* Step header */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.header
              key={step.id + "-h"}
              custom={direction}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="mb-10"
            >
              <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-blue mb-3">
                {String(stepIdx + 1).padStart(2, "0")} — {step.title}
              </div>
              <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-navy">
                {STEP_HEADLINES[step.id]}
              </h1>
              <p className="mt-3 text-[16px] text-ink-soft max-w-xl leading-relaxed">
                {STEP_SUBHEAD[step.id]}
              </p>
            </motion.header>
          </AnimatePresence>

          {/* Step body */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -32 }}
              transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              {step.id === "basics" && <StepBasics />}
              {step.id === "problem-solution" && <StepProblemSolution />}
              {step.id === "market" && <StepMarket />}
              {step.id === "traction" && <StepTraction />}
              {step.id === "team" && <StepTeam />}
              {step.id === "ask" && <StepAsk />}
            </motion.div>
          </AnimatePresence>

          {/* Footer nav */}
          <div className="mt-14 flex items-center justify-between border-t border-ink/8 pt-6">
            <button
              type="button"
              onClick={back}
              disabled={stepIdx === 0}
              className={clsx(
                "text-[14px] font-semibold transition-opacity",
                stepIdx === 0
                  ? "text-ink-faint opacity-40 cursor-not-allowed"
                  : "text-ink-soft hover:text-ink"
              )}
            >
              ← Back
            </button>
            <div className="flex items-center gap-3">
              <StepDots current={stepIdx} total={STEPS.length} />
              <motion.button
                type="button"
                onClick={next}
                disabled={isPending}
                whileTap={{ scale: 0.97 }}
                className="ml-3 inline-flex items-center gap-2 rounded-md bg-navy px-7 py-3.5 text-[14px] font-bold text-white transition-colors hover:bg-blue disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending
                  ? "Saving…"
                  : isLast
                  ? isEditing
                    ? "Save changes"
                    : "Submit"
                  : "Continue"}
                <span className="text-base">→</span>
              </motion.button>
            </div>
          </div>

          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-md border border-flag-red/30 bg-flag-red/8 p-4 text-[13px] text-flag-red"
            >
              <span className="font-bold">Couldn&apos;t submit · </span>
              {submitError}
            </motion.div>
          )}
        </div>
      </div>
    </FormProvider>
  );
}

/* ─── STEP HEADLINES ──────────────────────────────────────────────────── */
const STEP_HEADLINES: Record<string, string> = {
  basics: "The basics.",
  "problem-solution": "What you're solving.",
  market: "Where you play.",
  traction: "What you've shipped.",
  team: "Who's behind it.",
  ask: "What you need.",
};

const STEP_SUBHEAD: Record<string, string> = {
  basics: "Identity and where the company sits today. Two minutes of typing.",
  "problem-solution":
    "The thesis investors test against. Be specific — vague kills.",
  market: "Show you've thought about who buys, the size, and the moat.",
  traction: "Proof points to date. Numbers if you have them, milestones if not.",
  team: "Why this team for this problem, in plain language.",
  ask: "Round size, use of funds, where you are in the process.",
};

/* ─── STEP DOTS ───────────────────────────────────────────────────────── */
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.span
          key={i}
          animate={{
            width: i === current ? 22 : 6,
            backgroundColor:
              i < current ? "#4a78cc" : i === current ? "#1c2b42" : "#1917141a",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="h-1.5 rounded-full"
        />
      ))}
    </div>
  );
}

/* ─── INDIVIDUAL STEPS ────────────────────────────────────────────────── */
function StepBasics() {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <TextField
          name="companyName"
          label="Company name"
          placeholder="Threadline"
        />
        <TextField name="websiteUrl" label="Website" placeholder="https://…" type="url" />
      </div>
      <LogoPreview />
      <TextField
        name="oneLiner"
        label="One-liner"
        placeholder="What you do, in 80 characters or less."
        maxLength={80}
        help="The single sentence an investor reads first. Make it specific, not poetic."
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <NumberField name="foundedYear" label="Founded" placeholder="2024" />
        <TextField name="hqCity" label="HQ city" placeholder="Brooklyn" />
        <TextField name="hqCountry" label="Country" placeholder="USA" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <SelectField name="stage" label="Current stage" options={STAGES} />
      </div>
      <TagPicker
        name="sectors"
        label="Sectors (pick up to 4)"
        options={SECTORS}
        max={4}
        help="Used to match you to the right investor theses."
      />
    </>
  );
}

/* ─── Logo auto-fetch (Clearbit CDN, falls back to Google favicon) ───── */
function LogoPreview() {
  const { watch, setValue } = useFormContext<Submission>();
  const websiteUrl = watch("websiteUrl");
  const companyName = watch("companyName");
  const [logoOk, setLogoOk] = useState(false);

  // Compute the candidate URL whenever the website changes.
  const url = websiteUrl ? clearbitFor(websiteUrl) : null;
  const fallback = websiteUrl ? googleFaviconFor(websiteUrl) : null;

  // Persist to form state — on submit we save the highest-quality URL we have.
  useEffect(() => {
    if (!url) return;
    setValue("logoUrl", url, { shouldDirty: true });
  }, [url, setValue]);

  if (!websiteUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-4 rounded-lg border border-ink/8 bg-paper-2 p-4"
    >
      <div className="grid h-14 w-14 flex-shrink-0 place-items-center overflow-hidden rounded-lg border border-ink/10 bg-white">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoOk ? url : (fallback ?? url)}
            alt={companyName ? `${companyName} logo` : "Logo"}
            className="h-full w-full object-contain"
            onLoad={(e) => {
              // Treat the load as successful only if we got real pixels.
              const img = e.currentTarget;
              if (img.naturalWidth > 16) setLogoOk(true);
            }}
            onError={(e) => {
              // Try the favicon fallback then give up.
              const img = e.currentTarget;
              if (fallback && img.src !== fallback) {
                img.src = fallback;
              }
            }}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-faint">
          Auto-fetched logo
        </div>
        <div className="mt-0.5 truncate text-[13px] text-ink-soft">
          From{" "}
          <span className="font-bold text-ink">
            {(() => {
              try {
                return new URL(
                  websiteUrl.startsWith("http")
                    ? websiteUrl
                    : `https://${websiteUrl}`
                ).hostname.replace(/^www\./, "");
              } catch {
                return websiteUrl;
              }
            })()}
          </span>{" "}
          · Saved with your submission.
        </div>
      </div>
    </motion.div>
  );
}

function clearbitFor(rawUrl: string): string | null {
  const d = domainFor(rawUrl);
  return d ? `https://logo.clearbit.com/${d}?size=256` : null;
}
function googleFaviconFor(rawUrl: string): string | null {
  const d = domainFor(rawUrl);
  return d ? `https://www.google.com/s2/favicons?domain=${d}&sz=128` : null;
}
function domainFor(rawUrl: string): string | null {
  if (!rawUrl) return null;
  try {
    const u = new URL(
      rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`
    );
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function StepProblemSolution() {
  return (
    <>
      <TextareaField
        name="problemDescription"
        label="What problem are you solving?"
        rows={5}
        help="Describe the pain in concrete terms. Who feels it, when, and how badly."
      />
      <TextareaField
        name="whyNow"
        label="Why now?"
        rows={4}
        help="What changed in the last 1–3 years that makes this possible / urgent today?"
      />
      <TextareaField
        name="solutionDescription"
        label="Your solution"
        rows={5}
        help="What you actually do. Skip the marketing — just describe the product."
      />
      <TextField
        name="demoVideoUrl"
        label="Demo video (optional)"
        placeholder="https://loom.com/…"
        type="url"
      />
    </>
  );
}

function StepMarket() {
  return (
    <>
      <TextareaField
        name="icpDescription"
        label="Who's the customer?"
        rows={3}
        help="Be specific — segment, size, role of buyer."
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <NumberField
          name="tamUsd"
          label="TAM (USD)"
          prefix="$"
          placeholder="8000000000"
          help="Total addressable market in dollars."
        />
        <TextField
          name="tamReasoning"
          label="How did you compute it?"
          placeholder="X customers × $Y avg spend"
        />
      </div>
      <TextareaField
        name="competitorsAndEdge"
        label="Top 3 competitors and your edge"
        rows={4}
        help="Name them. Don't say 'we have no competitors.'"
      />
      <TextareaField
        name="defensibility"
        label="Defensibility / moat"
        rows={3}
        help="What gets harder for competitors as you grow?"
      />
    </>
  );
}

function StepTraction() {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <RadioGroup
          name="productStage"
          label="Product stage"
          options={PRODUCT_STAGES}
        />
        <ToggleField
          name="launched"
          label="Have you launched publicly?"
          description="Real customers using it in the wild."
        />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <NumberField
          name="customerCount"
          label="Customers / users"
          placeholder="27"
        />
        <NumberField
          name="mrrUsd"
          label="MRR (USD, optional)"
          prefix="$"
          placeholder="35000"
        />
        <NumberField
          name="momGrowthPct"
          label="MoM growth (%)"
          suffix="%"
          placeholder="22"
        />
      </div>
      <MilestoneList />
    </>
  );
}

function MilestoneList() {
  const { control, register, formState } = useFormContext<Submission>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "milestones" as never, // string[] — RHF v7 quirk
  });
  const err = formState.errors.milestones?.message as string | undefined;

  return (
    <div>
      <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-ink-soft">
        Top milestones (1–5)
      </label>
      <div className="space-y-2">
        {fields.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2"
          >
            <span className="flex h-12 w-9 flex-shrink-0 items-center justify-center rounded-md border border-ink/10 bg-paper-2 text-[12px] font-bold text-ink-faint">
              {String(i + 1).padStart(2, "0")}
            </span>
            <input
              type="text"
              placeholder="A milestone — short and concrete"
              className="w-full rounded-md border border-ink/10 bg-white px-3.5 py-3 text-[15px] text-ink placeholder:text-ink-faint outline-none transition-all focus:border-blue focus:ring-4 focus:ring-blue/15"
              {...register(`milestones.${i}` as const)}
            />
            {fields.length > 1 && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="rounded-md border border-ink/10 bg-white px-3 text-ink-faint transition-colors hover:border-flag-red hover:text-flag-red"
                aria-label="Remove"
              >
                ✕
              </button>
            )}
          </motion.div>
        ))}
      </div>
      {fields.length < 5 && (
        <button
          type="button"
          onClick={() => append("")}
          className="mt-3 text-[13px] font-semibold text-blue hover:text-blue-light"
        >
          + Add milestone
        </button>
      )}
      {err && (
        <p className="mt-1.5 text-[12px] font-medium text-flag-red">{err}</p>
      )}
    </div>
  );
}

function StepTeam() {
  return (
    <>
      <FounderList />
      <TextareaField
        name="whyThisTeam"
        label="Why is this team uniquely positioned?"
        rows={4}
        help="Domain depth, prior wins, why you'll outwork the alternatives."
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <NumberField name="teamSize" label="Team size" placeholder="6" />
        <TextField
          name="advisors"
          label="Advisors / notable backers (optional)"
          placeholder="e.g. Alex Heath, Operators Collective"
        />
      </div>
    </>
  );
}

function FounderList() {
  const { control, register, formState } = useFormContext<Submission>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "founders",
  });
  const errs = formState.errors.founders;

  return (
    <div>
      <label className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-ink-soft">
        Founders
      </label>
      <div className="space-y-3">
        <AnimatePresence>
          {fields.map((f, i) => (
            <motion.div
              key={f.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-lg border border-ink/10 bg-white p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">
                  Founder {i + 1}
                </span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-[12px] font-semibold text-ink-faint transition-colors hover:text-flag-red"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  placeholder="Name"
                  className="w-full rounded-md border border-ink/10 bg-paper px-3 py-2.5 text-[14px] outline-none focus:border-blue focus:ring-3 focus:ring-blue/15"
                  {...register(`founders.${i}.name`)}
                />
                <input
                  placeholder="Role (e.g. CEO, CTO)"
                  className="w-full rounded-md border border-ink/10 bg-paper px-3 py-2.5 text-[14px] outline-none focus:border-blue focus:ring-3 focus:ring-blue/15"
                  {...register(`founders.${i}.role`)}
                />
                <input
                  placeholder="LinkedIn URL"
                  type="url"
                  className="w-full rounded-md border border-ink/10 bg-paper px-3 py-2.5 text-[14px] outline-none focus:border-blue focus:ring-3 focus:ring-blue/15"
                  {...register(`founders.${i}.linkedinUrl`)}
                />
                <input
                  placeholder="One-line bio"
                  maxLength={160}
                  className="w-full rounded-md border border-ink/10 bg-paper px-3 py-2.5 text-[14px] outline-none focus:border-blue focus:ring-3 focus:ring-blue/15"
                  {...register(`founders.${i}.oneLineBio`)}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={() =>
          append({ name: "", role: "", linkedinUrl: "", oneLineBio: "" })
        }
        className="mt-3 text-[13px] font-semibold text-blue hover:text-blue-light"
      >
        + Add founder
      </button>
      {typeof errs?.message === "string" && (
        <p className="mt-1.5 text-[12px] font-medium text-flag-red">
          {errs.message}
        </p>
      )}
    </div>
  );
}

function StepAsk() {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <NumberField
          name="raisedToDateUsd"
          label="Raised to date (optional)"
          prefix="$"
        />
        <TextField
          name="raisedFromWhom"
          label="From whom (optional)"
          placeholder="e.g. BoxGroup, Hustle Fund, angels"
        />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <NumberField
          name="raisingUsd"
          label="Currently raising"
          prefix="$"
          placeholder="3500000"
        />
        <SelectField name="roundType" label="Round type" options={ROUND_TYPES} />
      </div>
      <TextareaField
        name="useOfFunds"
        label="Use of funds"
        rows={3}
        help="% allocation works. Be honest — investors compare this to your pitch."
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <TextField
          name="targetCloseDate"
          label="Target close date (optional)"
          type="text"
          placeholder="2026-09-30"
        />
        <TextField
          name="pitchDeckUrl"
          label="Pitch deck (optional)"
          type="url"
          placeholder="https://docsend.com/v/…"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 pt-4 border-t border-ink/8">
        <ToggleField
          name="showFinancialsPublic"
          label="Show financials on your public page"
          description="MRR and customer count visible to subscribed viewers. Burn/runway always private."
        />
        <ToggleField
          name="openToInvestorContact"
          label="Open to investor outreach"
          description="Matched investors can request to connect through Laelapx."
        />
      </div>
    </>
  );
}

/* ─── SUBMITTED CONFIRM ───────────────────────────────────────────────── */
function SubmittedConfirm({ data }: { data: Submission }) {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-xl w-full"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-flag-green/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-flag-green">
          ✓ Submitted
        </div>
        <h1 className="text-[48px] font-extrabold leading-[1.05] tracking-[-0.03em] text-navy">
          {data.companyName}, you&apos;re in.
        </h1>
        <p className="mt-4 text-[17px] text-ink-soft leading-relaxed max-w-lg">
          Your Fundability Snapshot is being scored. You&apos;ll see your dashboard,
          gap analysis, and matched investors here once it&apos;s ready.
        </p>
        <div className="mt-8 rounded-lg border border-ink/10 bg-white p-5 text-[13px] text-ink-soft">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-ink-faint">
            Submission preview (dev)
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap text-[12px] leading-relaxed">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </motion.div>
    </div>
  );
}
