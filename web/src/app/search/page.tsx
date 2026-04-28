import Link from "next/link";
import { stackServerApp } from "@/stack";
import { searchAll } from "@/lib/insforge/search";
import type { SearchHit, SearchResults } from "@/lib/insforge/search";

export const metadata = { title: "Search · Laelapx" };
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await stackServerApp.getUser({ or: "redirect" });
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const results: SearchResults = q
    ? await searchAll(q, 24)
    : { startups: [], funds: [], people: [], total: 0 };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/8 bg-paper-2 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue mb-3">
            Search
          </div>
          <h1 className="text-[clamp(36px,5vw,60px)] font-extrabold leading-[1.04] tracking-[-0.035em] text-navy">
            {q ? (
              <>
                <span className="text-ink-faint">Results for</span>{" "}
                <span className="text-blue">&ldquo;{q}&rdquo;</span>
              </>
            ) : (
              "Search Laelapx."
            )}
          </h1>
          {q && (
            <p className="mt-3 text-[14px] text-ink-soft">
              {results.total} match{results.total === 1 ? "" : "es"} across
              startups, funds, and people.
            </p>
          )}
          <div className="mt-4 flex gap-3 text-[13px]">
            <Link
              href="/founder"
              className="text-ink-soft transition-colors hover:text-ink"
            >
              ← Back to workspace
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {!q ? (
          <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-white p-14 text-center">
            <div className="text-[14px] font-bold text-ink">
              Use the search bar in the nav.
            </div>
            <p className="mt-2 text-[13px] text-ink-soft">
              Find any startup, fund, or person on Laelapx.
            </p>
          </div>
        ) : results.total === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-white p-14 text-center">
            <div className="text-[16px] font-bold text-ink">
              Nothing matched &ldquo;{q}&rdquo;.
            </div>
            <p className="mt-2 text-[13px] text-ink-soft">
              Try a different keyword. Search runs across company name,
              tagline, fund name, partner name, thesis, and people.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            <ResultsGroup
              eyebrow="01"
              label={`People · ${results.people.length}`}
              hits={results.people}
            />
            <ResultsGroup
              eyebrow="02"
              label={`Startups · ${results.startups.length}`}
              hits={results.startups}
            />
            <ResultsGroup
              eyebrow="03"
              label={`Funds · ${results.funds.length}`}
              hits={results.funds}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function ResultsGroup({
  eyebrow,
  label,
  hits,
}: {
  eyebrow: string;
  label: string;
  hits: SearchHit[];
}) {
  if (hits.length === 0) return null;
  return (
    <section>
      <div className="mb-5 flex items-baseline gap-3 text-ink-faint">
        <span className="text-[14px] font-bold tabular-nums tracking-wide">
          {eyebrow}
        </span>
        <span className="h-px w-10 bg-current opacity-40" />
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
          {label}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {hits.map((h) => (
          <ResultCard key={`${h.kind}-${h.slug}`} hit={h} />
        ))}
      </div>
    </section>
  );
}

function ResultCard({ hit }: { hit: SearchHit }) {
  const href =
    hit.kind === "startup"
      ? `/s/${hit.slug}`
      : hit.kind === "fund"
      ? `/v/${hit.slug}`
      : `/u/${hit.slug}`;
  const title =
    hit.kind === "startup"
      ? hit.companyName
      : hit.kind === "fund"
      ? hit.fundName
      : hit.displayName;
  const subtitle =
    hit.kind === "startup"
      ? hit.oneLiner
      : hit.kind === "fund"
      ? hit.thesisOneLiner
      : hit.headline;
  const meta =
    hit.kind === "startup"
      ? `${hit.stage} · ${hit.hq}`
      : hit.kind === "fund"
      ? hit.partnerName ?? hit.hq ?? null
      : null;
  const initials = (title || "??")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const kindBadge =
    hit.kind === "startup"
      ? "Startup"
      : hit.kind === "fund"
      ? "Fund"
      : "Person";

  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-xl border border-ink/10 bg-white p-5 transition-all hover:border-blue/40 hover:-translate-y-0.5"
    >
      {hit.kind === "person" && hit.profileImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hit.profileImageUrl}
          alt={hit.displayName}
          className="h-12 w-12 flex-shrink-0 rounded-lg border border-ink/10 object-cover"
        />
      ) : (
        <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue to-navy text-[13px] font-black text-white">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <div className="truncate text-[16px] font-extrabold tracking-tight text-navy group-hover:text-blue">
            {title}
          </div>
          <span className="flex-shrink-0 rounded bg-paper-2 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-faint">
            {kindBadge}
          </span>
        </div>
        {subtitle && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-soft">
            {subtitle}
          </p>
        )}
        {meta && (
          <div className="mt-1.5 text-[11px] uppercase tracking-[0.15em] text-ink-faint">
            {meta}
          </div>
        )}
      </div>
    </Link>
  );
}
