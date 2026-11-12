"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import {
  adminUpdateApplicationAction,
  adminUpdateKickoffAction,
} from "@/app/actions/fund-applications";
import type { ApplicationStatus, KickoffStatus } from "@/lib/insforge/fund-network";

type Person = { name: string; email: string | null };

export type AdminApplicationView = {
  id: string;
  founder: Person;
  companyName: string;
  slug: string | null;
  fundName: string;
  fundUrl: string;
  mode: "self" | "concierge";
  status: ApplicationStatus;
  amountCents: number;
  founderNotes: string | null;
  adminNotes: string | null;
  createdAt: string;
};

export type AdminKickoffView = {
  founderUserId: string;
  founder: Person;
  status: KickoffStatus;
  scheduledFor: string | null;
  adminNotes: string | null;
};

export type AdminFundView = {
  domain: string;
  fundName: string;
  websiteUrl: string;
  showInMarquee: boolean;
  lastSeenAt: string;
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";

const CONCIERGE_STATUSES: ApplicationStatus[] = ["paid", "in_progress", "submitted", "canceled"];
const KICKOFF_STATUSES: KickoffStatus[] = ["paid", "scheduled", "done"];

export function ApplicationsAdmin({
  applications,
  kickoffs,
  funds,
}: {
  applications: AdminApplicationView[];
  kickoffs: AdminKickoffView[];
  funds: AdminFundView[];
}) {
  // Unpaid checkouts are abandoned carts, not work; keep them out of the queue.
  const concierge = applications.filter((a) => a.mode === "concierge" && a.status !== "awaiting_payment");
  const self = applications.filter((a) => a.mode === "self");
  const openKickoffs = kickoffs.filter((k) => k.status !== "awaiting_payment");

  return (
    <div className="space-y-12">
      <section>
        <h3 className="text-[18px] font-extrabold tracking-tight text-navy">Apply for founders ({concierge.length})</h3>
        <p className="mt-1 text-[13px] text-ink-soft">
          Paid requests for the team to apply on a founder&apos;s behalf. Move each to submitted once it&apos;s in.
        </p>
        {concierge.length === 0 ? (
          <Empty>No paid requests yet.</Empty>
        ) : (
          <ul className="mt-4 space-y-3">
            {concierge.map((a) => (
              <ConciergeRow key={a.id} app={a} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-[18px] font-extrabold tracking-tight text-navy">Kickoff calls ({openKickoffs.length})</h3>
        <p className="mt-1 text-[13px] text-ink-soft">One per founder, before the team&apos;s first application for them.</p>
        {openKickoffs.length === 0 ? (
          <Empty>No kickoff calls booked yet.</Empty>
        ) : (
          <ul className="mt-4 space-y-3">
            {openKickoffs.map((k) => (
              <KickoffRow key={k.founderUserId} kickoff={k} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="text-[18px] font-extrabold tracking-tight text-navy">Founders who applied themselves ({self.length})</h3>
        {self.length === 0 ? (
          <Empty>None yet.</Empty>
        ) : (
          <Table head={["Founder", "Company", "Fund", "When"]}>
            {self.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3"><Who p={a.founder} /></td>
                <td className="px-4 py-3">{a.companyName}</td>
                <td className="px-4 py-3"><a href={a.fundUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue hover:underline">{a.fundName}</a></td>
                <td className="px-4 py-3">{fmt(a.createdAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section>
        <h3 className="text-[18px] font-extrabold tracking-tight text-navy">Fund network ({funds.length})</h3>
        <p className="mt-1 text-[13px] text-ink-soft">
          Every outside fund our research has matched to a Laelapx+ founder.
        </p>
        {funds.length === 0 ? (
          <Empty>No funds recorded yet. They appear as Laelapx+ founders open their dashboards.</Empty>
        ) : (
          <Table head={["Fund", "Last matched"]}>
            {funds.map((f) => (
              <FundRow key={f.domain} fund={f} />
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}

function ConciergeRow({ app }: { app: AdminApplicationView }) {
  const [status, setStatus] = useState(app.status);
  const [notes, setNotes] = useState(app.adminNotes ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <li className="rounded-xl border border-ink/10 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[15px] font-extrabold text-navy">
            {app.companyName} → <a href={app.fundUrl} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">{app.fundName} ↗</a>
          </div>
          <div className="mt-0.5 text-[12px] text-ink-faint">
            <Who p={app.founder} inline /> · paid ${(app.amountCents / 100).toFixed(0)} · {fmt(app.createdAt)}
            {app.slug ? <> · <a href={`/s/${app.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue hover:underline">startup page</a></> : null}
          </div>
        </div>
        <StatusPill status={status} />
      </div>
      {app.founderNotes ? (
        <p className="mt-3 rounded-md bg-paper p-3 text-[13px] text-ink"><span className="font-bold">Founder&apos;s note · </span>{app.founderNotes}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <select value={status} onChange={(e) => { setStatus(e.target.value as ApplicationStatus); setSaved(false); }} className="rounded-md border border-ink/15 bg-white px-2 py-2 text-[13px]">
          {CONCIERGE_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <input value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} placeholder="Internal notes" className="min-w-[220px] flex-1 rounded-md border border-ink/15 px-3 py-2 text-[13px]" />
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { await adminUpdateApplicationAction({ id: app.id, status, adminNotes: notes.trim() || null }); setSaved(true); })}
          className="rounded-md bg-navy px-4 py-2 text-[13px] font-bold text-white hover:bg-blue disabled:opacity-60"
        >
          {pending ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>
    </li>
  );
}

function KickoffRow({ kickoff }: { kickoff: AdminKickoffView }) {
  const [status, setStatus] = useState(kickoff.status);
  const [when, setWhen] = useState(kickoff.scheduledFor ? kickoff.scheduledFor.slice(0, 16) : "");
  const [notes, setNotes] = useState(kickoff.adminNotes ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-wrap items-end gap-2 rounded-xl border border-ink/10 bg-white p-4">
      <div className="mr-auto"><Who p={kickoff.founder} /></div>
      <select value={status} onChange={(e) => { setStatus(e.target.value as KickoffStatus); setSaved(false); }} className="rounded-md border border-ink/15 bg-white px-2 py-2 text-[13px]">
        {KICKOFF_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <input type="datetime-local" value={when} onChange={(e) => { setWhen(e.target.value); setSaved(false); }} className="rounded-md border border-ink/15 px-2 py-2 text-[13px]" />
      <input value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} placeholder="Notes" className="min-w-[180px] rounded-md border border-ink/15 px-3 py-2 text-[13px]" />
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          await adminUpdateKickoffAction({
            founderUserId: kickoff.founderUserId,
            status,
            scheduledFor: when ? new Date(when).toISOString() : null,
            adminNotes: notes.trim() || null,
          });
          setSaved(true);
        })}
        className="rounded-md bg-navy px-4 py-2 text-[13px] font-bold text-white hover:bg-blue disabled:opacity-60"
      >
        {pending ? "Saving…" : saved ? "Saved ✓" : "Save"}
      </button>
    </li>
  );
}

function FundRow({ fund }: { fund: AdminFundView }) {
  return (
    <tr>
      <td className="px-4 py-3">
        <a href={fund.websiteUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink hover:text-blue">{fund.fundName}</a>
        <div className="text-[11px] text-ink-faint">{fund.domain}</div>
      </td>
      <td className="px-4 py-3">{fmt(fund.lastSeenAt)}</td>
    </tr>
  );
}

function StatusPill({ status }: { status: ApplicationStatus }) {
  return (
    <span className={clsx(
      "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
      status === "submitted" ? "bg-flag-green/15 text-flag-green"
        : status === "canceled" ? "bg-ink/8 text-ink-faint"
        : "bg-flag-amber/15 text-flag-amber"
    )}>{status.replace("_", " ")}</span>
  );
}

function Who({ p, inline = false }: { p: Person; inline?: boolean }) {
  if (inline) return <>{p.name}{p.email ? ` (${p.email})` : ""}</>;
  return (
    <div>
      <div className="font-semibold text-ink">{p.name}</div>
      <div className="text-[11px] text-ink-faint">{p.email ?? "—"}</div>
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-ink/10 bg-white">
      <table className="w-full text-[13px]">
        <thead className="bg-paper-2 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-ink-faint">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-ink/8">{children}</tbody>
      </table>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 rounded-xl border border-dashed border-ink/15 p-6 text-[13px] text-ink-faint">{children}</div>;
}
