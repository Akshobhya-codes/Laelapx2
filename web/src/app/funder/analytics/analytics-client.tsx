"use client";

import { FunderNav } from "@/app/funder/discover/discover";
import { Reveal } from "@/components/motion/reveal";
import { LockedSection } from "@/components/billing/locked-section";
import { ChartCard, ColumnChart, BarList, StatTile, type Datum } from "@/components/charts/charts";
import { formatUsdShort } from "@/components/motion/animated-number";
import type { QuarterInsights } from "@/lib/billing/analytics";

type Data = {
  teamName: string | null;
  weekly: Datum[];
  totals: {
    opened: number;
    meetings: number;
    connectsSent: number;
    acceptRate: number | null;
    pending: number;
  };
  funnel: Datum[];
  stages: Datum[];
  sectors: Datum[];
  team: { name: string; isOwner: boolean; opened: number; meetings: number; connects: number; accepted: number }[];
  insights: QuarterInsights;
};

const usd = (n: number | null) => (n === null ? "—" : formatUsdShort(n));

export function AnalyticsView({
  displayName,
  profileImageUrl,
  planBadge,
  locked,
  data,
}: {
  displayName: string | null;
  profileImageUrl: string | null;
  planBadge: { name: string; tone: "neutral" | "paid" | "warn" };
  locked: boolean;
  data: Data | null;
}) {
  const firstName = displayName?.split(" ")[0] || "you";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <FunderNav firstName={firstName} profileImageUrl={profileImageUrl} breadcrumb="Analytics" planBadge={planBadge} />

      <header className="border-b border-ink/8 bg-paper-2 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">
              {data?.teamName ? `${data.teamName} · analytics` : "Analytics"}
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="text-[clamp(32px,4vw,52px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-navy">
              How your sourcing is performing.
            </h1>
          </Reveal>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {locked || !data ? (
          <LockedSection
            eyebrow="Analytics + quarterly insights"
            title="See your funnel, your team, and the market in one place."
            blurb="Weekly deal flow, conversion from opened to connected, per-partner activity, and a quarterly read on what's being raised across Laelapx."
            planName="Institutional Fund"
            href="/pricing?side=investor"
          />
        ) : (
          <div className="space-y-10">
            {/* KPI row */}
            <Reveal>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Founders opened" value={data.totals.opened.toLocaleString()} helper="All time, whole team" />
                <StatTile label="Meetings logged" value={data.totals.meetings.toLocaleString()} />
                <StatTile
                  label="Connects sent"
                  value={data.totals.connectsSent.toLocaleString()}
                  helper={`${data.totals.pending} awaiting a reply`}
                />
                <StatTile
                  label="Connect acceptance"
                  value={data.totals.acceptRate === null ? "—" : `${data.totals.acceptRate}%`}
                  helper="Of connects founders answered"
                />
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <ChartCard title="Founders opened per week" subtitle="Last 12 weeks · weeks start Monday (UTC)" data={data.weekly} valueLabel="Opened">
                <ColumnChart data={data.weekly} valueLabel="founders opened" />
              </ChartCard>
            </Reveal>

            <div className="grid gap-6 lg:grid-cols-2">
              <Reveal delay={0.08}>
                <ChartCard title="Funnel" subtitle="Unique companies at each step" data={data.funnel} valueLabel="Companies">
                  <BarList data={data.funnel} valueLabel="companies" emptyText="Open a founder to start the funnel." />
                </ChartCard>
              </Reveal>
              <Reveal delay={0.1}>
                <ChartCard title="Pipeline by stage" subtitle="Where deals sit right now" data={data.stages} valueLabel="Deals">
                  <BarList data={data.stages} valueLabel="deals" emptyText="Move deals on the pipeline board to see this." />
                </ChartCard>
              </Reveal>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Reveal delay={0.12}>
                <ChartCard title="Deal flow by sector" subtitle="Sectors of founders you opened" data={data.sectors} valueLabel="Companies">
                  <BarList data={data.sectors} valueLabel="companies" />
                </ChartCard>
              </Reveal>
              <Reveal delay={0.14}>
                <section className="rounded-2xl border border-ink/10 bg-white p-6">
                  <h3 className="text-[15px] font-extrabold tracking-tight text-navy">Partner activity</h3>
                  <p className="mt-0.5 text-[12px] text-ink-faint">Per seat, all time</p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-ink/10 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                          <th className="py-2">Partner</th>
                          <th className="py-2 text-right">Opened</th>
                          <th className="py-2 text-right">Meetings</th>
                          <th className="py-2 text-right">Connects</th>
                          <th className="py-2 text-right">Accepted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.team.map((t) => (
                          <tr key={t.name} className="border-b border-ink/5">
                            <td className="py-2 font-semibold text-ink">
                              {t.name}
                              {t.isOwner && <span className="ml-1.5 text-[11px] font-normal text-ink-faint">owner</span>}
                            </td>
                            <td className="py-2 text-right tabular-nums">{t.opened}</td>
                            <td className="py-2 text-right tabular-nums">{t.meetings}</td>
                            <td className="py-2 text-right tabular-nums">{t.connects}</td>
                            <td className="py-2 text-right tabular-nums">{t.accepted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </Reveal>
            </div>

            <QuarterlyInsights q={data.insights} />
          </div>
        )}
      </main>
    </div>
  );
}

function QuarterlyInsights({ q }: { q: QuarterInsights }) {
  const delta = q.newThisQuarter - q.newLastQuarter;
  return (
    <Reveal delay={0.16}>
      <section className="rounded-2xl border border-blue/25 bg-gradient-to-br from-blue/[0.05] via-white to-white p-7">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-blue">Quarterly insights · {q.label} so far</div>
        <h2 className="text-[22px] font-extrabold tracking-tight text-navy">What founders are raising on Laelapx.</h2>
        <p className="mt-1 max-w-2xl text-[13px] text-ink-soft">
          Aggregated across every submission on the platform. Any group under 3 companies is hidden,
          so no figure can be traced to a single founder.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatTile
            label="New submissions"
            value={q.newThisQuarter.toLocaleString()}
            helper={`${delta >= 0 ? "+" : ""}${delta} vs ${q.previousLabel}`}
          />
          <StatTile label="Median ask" value={usd(q.medianAskUsd)} helper={q.medianAskUsd === null ? "Not enough submissions yet" : "This quarter"} />
          <StatTile label="Median fundability" value={q.medianScore === null ? "—" : String(q.medianScore)} helper="Out of 100, this quarter" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
            <table className="w-full text-[13px]">
              <thead className="bg-paper-2 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5">Sector</th>
                  <th className="px-4 py-2.5 text-right">{q.label}</th>
                  <th className="px-4 py-2.5 text-right">{q.previousLabel}</th>
                  <th className="px-4 py-2.5 text-right">Median ask</th>
                </tr>
              </thead>
              <tbody>
                {q.sectors.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-faint">Not enough submissions this quarter yet.</td></tr>
                ) : (
                  q.sectors.map((s) => (
                    <tr key={s.sector} className="border-t border-ink/5">
                      <td className="px-4 py-2 font-semibold text-ink">{s.sector}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{s.thisQuarter}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-ink-soft">{s.lastQuarter}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{usd(s.medianAskUsd)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {q.foldedSectors > 0 && (
              <div className="border-t border-ink/5 px-4 py-2 text-[11px] text-ink-faint">
                {q.foldedSectors} smaller sector{q.foldedSectors === 1 ? "" : "s"} hidden (under 3 companies).
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white">
            <table className="w-full text-[13px]">
              <thead className="bg-paper-2 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5">Stage</th>
                  <th className="px-4 py-2.5 text-right">Companies</th>
                  <th className="px-4 py-2.5 text-right">Median ask</th>
                  <th className="px-4 py-2.5 text-right">Median score</th>
                </tr>
              </thead>
              <tbody>
                {q.stages.map((s) => (
                  <tr key={s.stage} className="border-t border-ink/5">
                    <td className="px-4 py-2 font-semibold text-ink">{s.stage}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{s.count}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{usd(s.medianAskUsd)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{s.medianScore ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-ink/5 px-4 py-2 text-[11px] text-ink-faint">All-time, across the platform.</div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}
