"use client";

import { useFormContext, Controller } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import type { Submission } from "@/lib/submission/schema";

type Path = keyof Submission | string;

const inputBase =
  "w-full rounded-md border border-ink/10 bg-white px-3.5 py-3 text-[15px] " +
  "text-ink placeholder:text-ink-faint outline-none transition-all " +
  "focus:border-blue focus:ring-4 focus:ring-blue/15";

const labelBase =
  "block text-[12px] font-bold uppercase tracking-[0.12em] text-ink-soft mb-2";

const helpBase = "mt-1.5 text-[12px] text-ink-faint leading-snug";

function ErrorLine({ msg }: { msg?: string }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="mt-1.5 text-[12px] font-medium text-flag-red"
        >
          {msg}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/* ─── TEXT INPUT ──────────────────────────────────────────────────────── */
export function TextField(props: {
  name: Path;
  label: string;
  placeholder?: string;
  help?: string;
  type?: "text" | "url" | "email";
  maxLength?: number;
}) {
  const {
    register,
    formState: { errors },
    watch,
  } = useFormContext();
  const err = (errors as Record<string, { message?: string }>)[props.name as string]?.message;
  const value = watch(props.name as string) as string | undefined;
  const remaining =
    props.maxLength && value !== undefined
      ? props.maxLength - String(value).length
      : null;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className={labelBase} htmlFor={props.name as string}>
          {props.label}
        </label>
        {remaining !== null && (
          <span
            className={clsx(
              "text-[11px] tabular-nums",
              remaining < 0 ? "text-flag-red" : "text-ink-faint"
            )}
          >
            {remaining} left
          </span>
        )}
      </div>
      <input
        id={props.name as string}
        type={props.type ?? "text"}
        placeholder={props.placeholder}
        maxLength={props.maxLength}
        className={inputBase}
        {...register(props.name as string)}
      />
      {props.help && <p className={helpBase}>{props.help}</p>}
      <ErrorLine msg={err} />
    </div>
  );
}

/* ─── TEXTAREA ────────────────────────────────────────────────────────── */
export function TextareaField(props: {
  name: Path;
  label: string;
  placeholder?: string;
  help?: string;
  rows?: number;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const err = (errors as Record<string, { message?: string }>)[props.name as string]?.message;

  return (
    <div>
      <label className={labelBase} htmlFor={props.name as string}>
        {props.label}
      </label>
      <textarea
        id={props.name as string}
        placeholder={props.placeholder}
        rows={props.rows ?? 4}
        className={clsx(inputBase, "resize-y leading-relaxed")}
        {...register(props.name as string)}
      />
      {props.help && <p className={helpBase}>{props.help}</p>}
      <ErrorLine msg={err} />
    </div>
  );
}

/* ─── NUMBER INPUT ────────────────────────────────────────────────────── */
export function NumberField(props: {
  name: Path;
  label: string;
  placeholder?: string;
  help?: string;
  prefix?: string;
  suffix?: string;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const err = (errors as Record<string, { message?: string }>)[props.name as string]?.message;

  return (
    <div>
      <label className={labelBase} htmlFor={props.name as string}>
        {props.label}
      </label>
      <div className="relative">
        {props.prefix && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-faint">
            {props.prefix}
          </span>
        )}
        <input
          id={props.name as string}
          type="number"
          inputMode="numeric"
          placeholder={props.placeholder}
          className={clsx(inputBase, props.prefix && "pl-7", props.suffix && "pr-10")}
          {...register(props.name as string, {
            setValueAs: (v) =>
              v === "" || v === null || v === undefined ? undefined : Number(v),
          })}
        />
        {props.suffix && (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-ink-faint">
            {props.suffix}
          </span>
        )}
      </div>
      {props.help && <p className={helpBase}>{props.help}</p>}
      <ErrorLine msg={err} />
    </div>
  );
}

/* ─── SELECT (single) ─────────────────────────────────────────────────── */
export function SelectField<T extends string>(props: {
  name: Path;
  label: string;
  options: readonly T[];
  help?: string;
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const err = (errors as Record<string, { message?: string }>)[props.name as string]?.message;

  return (
    <div>
      <label className={labelBase} htmlFor={props.name as string}>
        {props.label}
      </label>
      <select
        id={props.name as string}
        className={clsx(inputBase, "appearance-none pr-10 cursor-pointer bg-white")}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239a968e' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
        }}
        {...register(props.name as string)}
      >
        {props.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {props.help && <p className={helpBase}>{props.help}</p>}
      <ErrorLine msg={err} />
    </div>
  );
}

/* ─── MULTI TAG PICKER (for sectors etc.) ─────────────────────────────── */
export function TagPicker<T extends string>(props: {
  name: Path;
  label: string;
  options: readonly T[];
  help?: string;
  max?: number;
}) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={props.name as string}
      render={({ field, fieldState }) => {
        const value = (field.value as T[]) ?? [];
        const toggle = (opt: T) => {
          if (value.includes(opt)) field.onChange(value.filter((v) => v !== opt));
          else if (!props.max || value.length < props.max)
            field.onChange([...value, opt]);
        };
        return (
          <div>
            <label className={labelBase}>{props.label}</label>
            <div className="flex flex-wrap gap-2">
              {props.options.map((o) => {
                const on = value.includes(o);
                return (
                  <motion.button
                    type="button"
                    key={o}
                    onClick={() => toggle(o)}
                    whileTap={{ scale: 0.96 }}
                    className={clsx(
                      "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                      on
                        ? "border-blue bg-blue text-white"
                        : "border-ink/10 bg-white text-ink-soft hover:border-ink/25 hover:text-ink"
                    )}
                  >
                    {o}
                  </motion.button>
                );
              })}
            </div>
            {props.help && <p className={helpBase}>{props.help}</p>}
            <ErrorLine msg={fieldState.error?.message} />
          </div>
        );
      }}
    />
  );
}

/* ─── RADIO GROUP (inline pill switcher for short enums) ──────────────── */
export function RadioGroup<T extends string>(props: {
  name: Path;
  label: string;
  options: readonly T[];
  help?: string;
}) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={props.name as string}
      render={({ field, fieldState }) => (
        <div>
          <label className={labelBase}>{props.label}</label>
          <div className="flex flex-wrap gap-1.5 rounded-md border border-ink/10 bg-white p-1.5">
            {props.options.map((o) => {
              const on = field.value === o;
              return (
                <button
                  type="button"
                  key={o}
                  onClick={() => field.onChange(o)}
                  className={clsx(
                    "relative flex-1 min-w-[80px] rounded-[5px] px-3 py-2 text-[13px] font-semibold transition-colors",
                    on ? "text-white" : "text-ink-soft hover:text-ink"
                  )}
                >
                  {on && (
                    <motion.span
                      layoutId={`radio-bg-${props.name as string}`}
                      className="absolute inset-0 rounded-[5px] bg-navy"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative">{o}</span>
                </button>
              );
            })}
          </div>
          {props.help && <p className={helpBase}>{props.help}</p>}
          <ErrorLine msg={fieldState.error?.message} />
        </div>
      )}
    />
  );
}

/* ─── TOGGLE ─────────────────────────────────────────────────────────── */
export function ToggleField(props: {
  name: Path;
  label: string;
  description?: string;
}) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={props.name as string}
      render={({ field }) => {
        const on = !!field.value;
        return (
          <button
            type="button"
            onClick={() => field.onChange(!on)}
            className="flex w-full items-center justify-between rounded-md border border-ink/10 bg-white px-4 py-3.5 text-left transition-colors hover:border-ink/25"
          >
            <div className="pr-4">
              <div className="text-[14px] font-bold text-ink">{props.label}</div>
              {props.description && (
                <div className="mt-0.5 text-[12px] text-ink-faint leading-snug">
                  {props.description}
                </div>
              )}
            </div>
            <span
              className={clsx(
                "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
                on ? "bg-blue" : "bg-ink/15"
              )}
            >
              <motion.span
                animate={{ x: on ? 22 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-0.5 left-0 h-5 w-5 rounded-full bg-white shadow-sm"
              />
            </span>
          </button>
        );
      }}
    />
  );
}
