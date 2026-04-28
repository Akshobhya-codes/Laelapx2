import { SectionTitle } from "./dashboard";

/**
 * Loading shell for <Audience>. Reserves layout space so streaming-in
 * doesn't cause CLS, and gives the user something visibly progressing.
 */
export function AudienceSkeleton() {
  return (
    <section className="mt-20">
      <SectionTitle
        eyebrow="04 — Audience"
        title="Reading who's viewing your startup…"
      />

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-ink/10 bg-white p-6">
            <div className="h-3 w-24 animate-pulse rounded bg-ink/8" />
            <div className="mt-4 h-10 w-16 animate-pulse rounded bg-ink/10" />
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-7">
        <div className="h-3 w-40 animate-pulse rounded bg-ink/8" />
        <div className="mt-5 h-[80px] animate-pulse rounded-md bg-ink/5" />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-ink/10 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 animate-pulse rounded-lg bg-ink/8" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-ink/10" />
                <div className="h-3 w-24 animate-pulse rounded bg-ink/8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
