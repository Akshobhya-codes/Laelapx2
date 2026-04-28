import Link from "next/link";
import {
  getAudienceStats,
  getViewSparkline,
  listRecentViewers,
  listIncomingConnects,
  type Viewer,
  type IncomingConnect,
  type AudienceStats,
  type ViewBucket,
} from "@/lib/insforge/audience";
import type { StoredSubmission } from "@/lib/insforge/submissions";
import { SectionTitle } from "./dashboard";
import {
  Sparkline,
  ConnectInboxCard,
  AudienceStatCard,
} from "./audience-pieces";

/**
 * Server component: fetches audience data (views, viewers, connects) for a
 * submission and renders the founder-side analytics section.
 *
 * Owns its own data dependencies so the parent page can render it inside a
 * <Suspense> boundary if streaming is desired.
 */
export async function Audience({
  submission,
}: {
  submission: StoredSubmission;
}) {
  const [stats, sparkline, viewers, incomingConnects] = await Promise.all([
    getAudienceStats(submission.id),
    getViewSparkline(submission.id, 14),
    listRecentViewers(submission, 8),
    listIncomingConnects(submission),
  ]);

  return (
    <section className="mt-20">
      <SectionTitle
        eyebrow="04 — Audience"
        title="Who's viewing your startup."
      />

      {/* Stats row */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AudienceStatCard
          label="Total views"
          value={stats.totalViews}
          delay={0}
        />
        <AudienceStatCard
          label="Investor viewers"
          value={stats.uniqueInvestorViewers}
          helper="Unique funds"
          highlight
          delay={0.06}
        />
        <AudienceStatCard
          label="Saves"
          value={stats.saves}
          helper="Watchlist adds"
          delay={0.12}
        />
        <AudienceStatCard
          label="Connect requests"
          value={stats.pendingConnects}
          helper="Pending"
          delay={0.18}
        />
      </div>

      {/* Sparkline */}
      <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-7">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-faint">
              Views · last 14 days
            </div>
            <div className="mt-1 text-[14px] font-semibold text-ink-soft">
              {sparkline.reduce((a, b) => a + b.count, 0)} total
            </div>
          </div>
        </div>
        <Sparkline buckets={sparkline} />
      </div>

      {/* Pending connect requests inbox */}
      {incomingConnects.length > 0 && (
        <div className="mt-12">
          <div className="mb-5 flex items-baseline justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue mb-2">
                Inbox · pending
              </div>
              <h3 className="text-[clamp(22px,2.6vw,30px)] font-extrabold tracking-tight text-navy">
                {incomingConnects.length} investor
                {incomingConnects.length === 1 ? "" : "s"} want
                {incomingConnects.length === 1 ? "s" : ""} to connect.
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {incomingConnects.map((c) => (
              <ConnectInboxCard
                key={c.id}
                connect={c}
                ownerSlug={submission.slug}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent viewers */}
      <div className="mt-12">
        <div className="mb-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue mb-2">
            Recent investor viewers
          </div>
          <h3 className="text-[clamp(22px,2.6vw,30px)] font-extrabold tracking-tight text-navy">
            Funds that opened your page.
          </h3>
        </div>
        {viewers.length === 0 ? (
          <EmptyViewerList />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {viewers.map((v) => (
              <ViewerCard key={v.viewerUserId} viewer={v} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── VIEWER CARD ─────────────────────────────────────────────────────── */
function ViewerCard({ viewer }: { viewer: Viewer }) {
  const initials = (viewer.fundName || viewer.partnerName || "··")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const fitTone =
    viewer.fit === null
      ? "border-ink/10 bg-paper text-ink-faint"
      : viewer.fit >= 85
      ? "border-flag-green/30 bg-flag-green/10 text-flag-green"
      : viewer.fit >= 65
      ? "border-blue/30 bg-blue/10 text-blue"
      : "border-flag-amber/30 bg-flag-amber/10 text-flag-amber";

  const Wrapper = viewer.fundSlug
    ? ({ children }: { children: React.ReactNode }) => (
        <Link
          href={`/v/${viewer.fundSlug}`}
          className="group flex items-start gap-4 rounded-xl border border-ink/10 bg-white p-5 transition-all hover:border-blue/40 hover:-translate-y-0.5"
        >
          {children}
        </Link>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div className="flex items-start gap-4 rounded-xl border border-ink/10 bg-white p-5">
          {children}
        </div>
      );

  return (
    <Wrapper>
      <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue to-navy text-[13px] font-black text-white">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[15px] font-extrabold tracking-tight text-navy truncate group-hover:text-blue">
            {viewer.fundName || "Unnamed fund"}
          </div>
          {viewer.fit !== null && (
            <div
              className={`flex flex-col items-end rounded-md border px-2 py-0.5 ${fitTone}`}
            >
              <span className="text-[12px] font-extrabold leading-none tabular-nums">
                {viewer.fit}
                <span className="text-[8px] font-bold opacity-70">%</span>
              </span>
              <span className="text-[7px] font-bold uppercase tracking-[0.2em] opacity-70">
                Fit
              </span>
            </div>
          )}
        </div>
        <div className="mt-0.5 text-[12px] text-ink-faint">
          {viewer.partnerName ? viewer.partnerName : "—"}
          {viewer.hq ? ` · ${viewer.hq}` : ""}
          {" · "}
          {relativeTime(viewer.viewedAt)}
        </div>
        {viewer.thesisOneLiner && (
          <p className="mt-2 text-[12px] italic leading-[1.5] text-ink-soft line-clamp-2">
            “{viewer.thesisOneLiner}”
          </p>
        )}
      </div>
    </Wrapper>
  );
}

function EmptyViewerList() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-paper-2 p-10 text-center">
      <div className="text-[14px] font-semibold text-ink">
        No investor views yet.
      </div>
      <p className="mx-auto mt-2 max-w-md text-[13px] text-ink-soft">
        When a signed-in investor opens your public page, they appear here
        with their thesis-fit score against your submission.
      </p>
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(1, Math.floor((now - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* re-export types for caller convenience */
export type { Viewer, IncomingConnect, AudienceStats, ViewBucket };
