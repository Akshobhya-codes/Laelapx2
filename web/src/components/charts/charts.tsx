"use client";

import { useState } from "react";
import clsx from "clsx";

/**
 * Minimal single-series charts for the investor analytics page.
 *
 * Built to the dataviz spec: one series → one hue (brand blue, validated
 * ≥3:1 against the card surface), no legend box (the card title names the
 * series), columns ≤24px with a 4px rounded data end and a square baseline,
 * hairline solid gridlines, sparing value labels, a per-mark hover/focus
 * tooltip whose hit area spans the whole band, and a table view for every
 * chart so no value is tooltip-only.
 */

const SERIES = "bg-blue"; // #2c5ba8 — passes the palette validator on light surfaces

export type Datum = { label: string; value: number; detail?: string };

/** Round the axis max up to a clean number. */
function niceMax(n: number): number {
  if (n <= 4) return 4;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= n / 4) ?? 10;
  return Math.ceil(n / (step * pow)) * step * pow;
}

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  : String(n);

/* ─── CARD SHELL (title + table toggle) ──────────────────────────────── */

export function ChartCard({
  title,
  subtitle,
  data,
  valueLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  data: Datum[];
  valueLabel: string;
  children: React.ReactNode;
}) {
  const [table, setTable] = useState(false);
  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-extrabold tracking-tight text-navy">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12px] text-ink-faint">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setTable(!table)}
          aria-pressed={table}
          className="flex-shrink-0 rounded-md border border-ink/10 px-2.5 py-1 text-[11px] font-semibold text-ink-soft transition-colors hover:border-ink/25 hover:text-ink"
        >
          {table ? "Chart" : "Table"}
        </button>
      </div>
      {table ? (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-ink/10 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint">
              <th className="py-2 font-bold">Label</th>
              <th className="py-2 text-right font-bold">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-b border-ink/5">
                <td className="py-1.5 text-ink">{d.label}</td>
                <td className="py-1.5 text-right tabular-nums text-ink">{d.value.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        children
      )}
    </section>
  );
}

/* ─── COLUMN CHART (trend over time) ─────────────────────────────────── */

export function ColumnChart({
  data,
  valueLabel,
  height = 160,
}: {
  data: Datum[];
  valueLabel: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const ticks = [0, max / 2, max];
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const last = data.length - 1;
  // Label only the peak and the latest column — never every bar.
  const labeled = new Set([peak, last]);
  // X labels: every other band keeps 12 weekly labels from colliding.
  const showX = (i: number) => i === last || (last - i) % 2 === 0;

  return (
    <div className="flex gap-3">
      {/* Y axis */}
      <div className="relative w-8 flex-shrink-0 text-right text-[10px] tabular-nums text-ink-faint" style={{ height }}>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / max) * 100}%` }}>
            {compact(t)}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          {/* Gridlines: hairline, solid, recessive */}
          {ticks.map((t) => (
            <div key={t} className="absolute left-0 right-0 h-px bg-ink/8" style={{ top: `${(1 - t / max) * 100}%` }} />
          ))}

          <div className="absolute inset-0 flex items-end">
            {data.map((d, i) => {
              const pct = (d.value / max) * 100;
              const active = hover === i;
              return (
                <div
                  key={d.label}
                  tabIndex={0}
                  role="img"
                  aria-label={`${d.label}: ${d.value} ${valueLabel}`}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  // The whole band is the hit target, not just the painted bar.
                  className="relative flex h-full flex-1 items-end justify-center px-[1px] outline-none"
                >
                  {labeled.has(i) && d.value > 0 && (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold text-ink-soft"
                      style={{ bottom: `calc(${pct}% + 4px)` }}
                    >
                      {d.value.toLocaleString()}
                    </span>
                  )}
                  <div
                    className={clsx(
                      SERIES,
                      "w-full max-w-[24px] rounded-t-[4px] transition-opacity",
                      active ? "opacity-80" : hover !== null ? "opacity-60" : "opacity-100"
                    )}
                    style={{ height: d.value > 0 ? `max(${pct}%, 2px)` : 0 }}
                  />
                  {active && (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-ink/10 bg-white px-2.5 py-1.5 shadow-[0_6px_20px_rgba(28,43,66,0.12)]"
                      style={{ left: "50%", bottom: `calc(${Math.min(pct, 80)}% + 22px)` }}
                    >
                      <div className="text-[13px] font-bold tabular-nums text-ink">{d.value.toLocaleString()}</div>
                      <div className="text-[11px] text-ink-faint">{d.detail ?? d.label}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {/* X axis band — inside the container's height, never clipped */}
        <div className="mt-2 flex border-t border-ink/10 pt-1.5">
          {data.map((d, i) => (
            <span key={d.label} className="flex-1 text-center text-[10px] text-ink-faint">
              {showX(i) ? d.label : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── BAR LIST (compare magnitude across categories) ─────────────────── */

export function BarList({
  data,
  valueLabel,
  emptyText = "Nothing yet.",
}: {
  data: Datum[];
  valueLabel: string;
  emptyText?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <p className="py-6 text-center text-[13px] text-ink-faint">{emptyText}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <li
            key={d.label}
            tabIndex={0}
            aria-label={`${d.label}: ${d.value} ${valueLabel}`}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="relative grid grid-cols-[minmax(84px,30%)_1fr] items-center gap-3 rounded-md py-0.5 outline-none focus-visible:ring-2 focus-visible:ring-blue/30"
          >
            <span className="truncate text-[12px] text-ink-soft" title={d.label}>{d.label}</span>
            <span className="flex items-center gap-2">
              <span
                className={clsx(
                  SERIES,
                  // 4px rounded data end, square at the baseline (left)
                  "h-[14px] rounded-r-[4px] transition-opacity",
                  hover !== null && hover !== i ? "opacity-60" : "opacity-100"
                )}
                style={{ width: d.value > 0 ? `max(${pct * 0.82}%, 2px)` : 0 }}
              />
              {/* Value at the tip, in text ink — never the series color */}
              <span className="text-[12px] font-semibold tabular-nums text-ink">{d.value.toLocaleString()}</span>
            </span>
            {hover === i && d.detail && (
              <span
                role="tooltip"
                className="pointer-events-none absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded-md border border-ink/10 bg-white px-2.5 py-1.5 text-[11px] text-ink-soft shadow-[0_6px_20px_rgba(28,43,66,0.12)]"
              >
                {d.detail}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ─── STAT TILE ──────────────────────────────────────────────────────── */

export function StatTile({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-5">
      <div className="text-[11px] font-semibold text-ink-faint">{label}</div>
      {/* Proportional figures on standalone values */}
      <div className="mt-1.5 text-[28px] font-extrabold leading-none tracking-[-0.02em] text-navy">{value}</div>
      {helper && <div className="mt-1.5 text-[12px] text-ink-soft">{helper}</div>}
    </div>
  );
}
