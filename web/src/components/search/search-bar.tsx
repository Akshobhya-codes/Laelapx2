"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { searchAction } from "@/app/actions/search";
import type {
  SearchResults,
  SearchHit,
} from "@/lib/insforge/search";

const DEBOUNCE_MS = 220;

const EMPTY_RESULTS: SearchResults = {
  startups: [],
  funds: [],
  people: [],
  total: 0,
};

export function SearchBar({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flat list (in display order) for keyboard nav.
  const flat: SearchHit[] = useMemo(
    () => [...results.people, ...results.startups, ...results.funds],
    [results]
  );

  // Debounced fetch when query changes.
  useEffect(() => {
    if (q.trim().length === 0) {
      setResults(EMPTY_RESULTS);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await searchAction(q);
          setResults(res);
          setActiveIdx(0);
        } catch {
          setResults(EMPTY_RESULTS);
        }
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q]);

  // Outside-click close.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Keyboard nav.
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = flat[activeIdx];
      if (hit) {
        navigateToHit(router, hit);
        close();
      } else if (q.trim()) {
        router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        close();
      }
    } else if (e.key === "Escape") {
      close();
    }
  };

  const close = () => {
    setOpen(false);
    inputRef.current?.blur();
  };

  const showAllResults = () => {
    if (q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      close();
    }
  };

  const isDark = variant === "dark";

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div
        className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 transition-colors ${
          isDark
            ? "border-white/15 bg-white/5 text-white"
            : "border-ink/10 bg-paper-2 text-ink"
        }`}
      >
        <SearchIcon
          className={isDark ? "text-white/55" : "text-ink-faint"}
        />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search startups, funds, people…"
          className={`min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:opacity-60 ${
            isDark ? "placeholder:text-white/45" : "placeholder:text-ink-faint"
          }`}
          aria-label="Search"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setResults(EMPTY_RESULTS);
              inputRef.current?.focus();
            }}
            className={`text-[14px] leading-none ${
              isDark ? "text-white/45" : "text-ink-faint"
            }`}
            aria-label="Clear"
          >
            ✕
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && q.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 right-0 top-12 z-40 max-h-[68vh] overflow-y-auto rounded-2xl border border-ink/10 bg-white shadow-[0_18px_60px_rgba(28,43,66,0.18)]"
          >
            {results.total === 0 ? (
              <div className="p-6 text-center">
                <div className="text-[13px] font-semibold text-ink">
                  No matches.
                </div>
                <p className="mt-1 text-[11px] text-ink-faint">
                  Try a different keyword, or hit Enter to see all results for
                  &ldquo;{q.trim()}&rdquo;.
                </p>
              </div>
            ) : (
              <>
                <ResultGroup
                  label="People"
                  hits={results.people}
                  flatStartIdx={0}
                  activeIdx={activeIdx}
                  onPick={() => close()}
                />
                <ResultGroup
                  label="Startups"
                  hits={results.startups}
                  flatStartIdx={results.people.length}
                  activeIdx={activeIdx}
                  onPick={() => close()}
                />
                <ResultGroup
                  label="Funds"
                  hits={results.funds}
                  flatStartIdx={
                    results.people.length + results.startups.length
                  }
                  activeIdx={activeIdx}
                  onPick={() => close()}
                />
                <button
                  type="button"
                  onClick={showAllResults}
                  className="block w-full border-t border-ink/8 px-5 py-3 text-left text-[12px] font-bold uppercase tracking-[0.18em] text-blue transition-colors hover:bg-paper-2"
                >
                  See all results for &ldquo;{q.trim()}&rdquo; →
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── RESULT GROUP ────────────────────────────────────────────────────── */
function ResultGroup({
  label,
  hits,
  flatStartIdx,
  activeIdx,
  onPick,
}: {
  label: string;
  hits: SearchHit[];
  flatStartIdx: number;
  activeIdx: number;
  onPick: () => void;
}) {
  if (hits.length === 0) return null;
  return (
    <div>
      <div className="px-5 pt-4 pb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-ink-faint">
        {label}
      </div>
      <ul>
        {hits.map((h, i) => (
          <ResultRow
            key={`${h.kind}-${h.slug}`}
            hit={h}
            active={flatStartIdx + i === activeIdx}
            onClick={onPick}
          />
        ))}
      </ul>
    </div>
  );
}

function ResultRow({
  hit,
  active,
  onClick,
}: {
  hit: SearchHit;
  active: boolean;
  onClick: () => void;
}) {
  const href = hrefFor(hit);
  const initials = (titleFor(hit) || "??")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const meta = subtitleFor(hit);
  const kindBadge =
    hit.kind === "startup"
      ? "Startup"
      : hit.kind === "fund"
      ? "Fund"
      : "Person";
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={`flex items-center gap-3 px-5 py-2.5 transition-colors ${
          active ? "bg-blue/8" : "hover:bg-paper-2"
        }`}
      >
        {hit.kind === "person" && hit.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hit.profileImageUrl}
            alt={hit.displayName}
            className="h-9 w-9 flex-shrink-0 rounded-full border border-ink/10"
          />
        ) : (
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue to-navy text-[11px] font-black text-white">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[14px] font-extrabold text-navy">
              {titleFor(hit)}
            </span>
            <span className="flex-shrink-0 rounded bg-paper-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-faint">
              {kindBadge}
            </span>
          </div>
          {meta && (
            <div className="truncate text-[12px] text-ink-soft">{meta}</div>
          )}
        </div>
      </Link>
    </li>
  );
}

function titleFor(h: SearchHit): string {
  if (h.kind === "startup") return h.companyName;
  if (h.kind === "fund") return h.fundName;
  return h.displayName;
}

function subtitleFor(h: SearchHit): string | null {
  if (h.kind === "startup") return `${h.oneLiner} · ${h.stage} · ${h.hq}`;
  if (h.kind === "fund")
    return `${h.partnerName ?? ""}${h.partnerName && h.hq ? " · " : ""}${
      h.hq ?? ""
    } — ${h.thesisOneLiner}`.trim();
  return h.headline ?? null;
}

function hrefFor(h: SearchHit): string {
  if (h.kind === "startup") return `/s/${h.slug}`;
  if (h.kind === "fund") return `/v/${h.slug}`;
  return `/u/${h.slug}`;
}

function navigateToHit(
  router: ReturnType<typeof useRouter>,
  hit: SearchHit
): void {
  router.push(hrefFor(hit));
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 flex-shrink-0 ${className ?? ""}`}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}
