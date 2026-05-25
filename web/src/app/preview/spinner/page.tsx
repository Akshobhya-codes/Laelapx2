import { LogoSpinner } from "@/components/motion/logo-spinner";

// TEMPORARY preview route. Delete src/app/preview/ when you're done eyeballing.
export const metadata = { title: "Spinner preview" };

export default function SpinnerPreview() {
  return (
    <div className="min-h-screen bg-paper px-8 py-20 text-ink">
      <div className="mx-auto max-w-3xl space-y-16">
        <div>
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-ink-faint">
            Default — 56px
          </div>
          <div className="rounded-2xl border border-dashed border-ink/15 bg-paper-2/40 px-6 py-16">
            <LogoSpinner label="Searching the web for funds…" />
          </div>
        </div>

        <div>
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-ink-faint">
            Large — 120px, no label
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white px-6 py-20">
            <LogoSpinner size={120} />
          </div>
        </div>

        <div>
          <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-ink-faint">
            Tiny — 32px
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white px-6 py-12">
            <LogoSpinner size={32} label="Loading" />
          </div>
        </div>
      </div>
    </div>
  );
}
