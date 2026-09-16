import Link from "next/link";
import { stackServerApp } from "@/stack";

export default async function Home() {
  // No auth gate on / — it's a dev/landing entrypoint. We show different
  // CTAs depending on whether you're signed in.
  const user = await stackServerApp.getUser();
  const firstName = user?.displayName?.split(" ")[0] || null;

  return (
    <div className="min-h-screen bg-paper">
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-ink/8 bg-paper/85 px-8 py-5 backdrop-blur-sm">
        <div className="text-[17px] font-black tracking-tight text-navy">
          Laelapx<span className="text-blue">.</span>
          <span className="ml-2 text-[12px] font-semibold text-ink-faint">
            / dev console
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/welcome"
                className="text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
              >
                Welcome
              </Link>
              <Link
                href="/founder"
                className="text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
              >
                Founder
              </Link>
              <Link
                href="/funder"
                className="text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
              >
                Investor
              </Link>
              <Link
                href="/handler/sign-out"
                className="rounded-md bg-navy px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue"
              >
                Sign out ({firstName})
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/handler/sign-in"
                className="text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
              >
                Sign in
              </Link>
              <Link
                href="/handler/sign-up"
                className="rounded-md bg-navy px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-8 py-24">
        <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-blue mb-4">
          Internal · pre-launch dev console
        </div>
        <h1 className="text-[clamp(48px,7vw,84px)] font-extrabold leading-[1.02] tracking-[-0.035em] text-navy">
          Build mode.
          {user ? (
            <>
              <br />
              You&apos;re signed in.
            </>
          ) : (
            <>
              <br />
              Sign in to start.
            </>
          )}
        </h1>
        <p className="mt-5 text-[18px] leading-relaxed text-ink-soft max-w-xl">
          {user ? (
            <>
              All routes below are gated. Stack Auth + Insforge wired. Pick
              any to test — Threadline is seeded as your one demo project.
            </>
          ) : (
            <>
              Most routes require auth. Click sign in to access the founder
              workspace, dashboard, and submission flow.
            </>
          )}
        </p>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RouteCard
            href="/welcome"
            number="01"
            title="Welcome / role chooser"
            body="Post-sign-in landing. Pick founder or investor."
            cta="Open →"
          />
          <RouteCard
            href="/founder"
            number="02"
            title="Founder workspace"
            body="Project list. Threadline seeded as your demo. + New submission."
            cta="Open →"
          />
          <RouteCard
            href="/founder/threadline"
            number="03"
            title="Company hub"
            body="Tabs: Dashboard / Edit / Public page. Score gauge, gaps, matches stream in."
            cta="Open →"
          />
          <RouteCard
            href="/founder/new"
            number="04"
            title="Submission form"
            body="6 steps. Pre-filled with the Threadline dummy data."
            cta="Open →"
          />
          <RouteCard
            href="/funder"
            number="05"
            title="Investor home"
            body="Thesis card, top matches, stats. Empty-state CTA when thesis is unset."
            cta="Open →"
          />
          <RouteCard
            href="/funder/discover"
            number="06"
            title="Discover startups"
            body="LinkedIn-jobs-style grid. Filter by stage / sector. Sorted by thesis fit."
            cta="Open →"
          />
          <RouteCard
            href="/funder/thesis"
            number="07"
            title="Thesis intake"
            body="Single-page form: stages, sectors, check size, portfolio, partner identity."
            cta="Open →"
          />
          <RouteCard
            href="/s/threadline"
            number="08"
            title="Public startup page"
            body="The pitch surface investors land on. Public, no auth required."
            cta="Open →"
          />
          <RouteCard
            href="/messages"
            number="09"
            title="Messages"
            body="Conversation list + thread view. Auto-created when a connect request is accepted. Polls every 4s."
            cta="Open →"
          />
          <RouteCard
            href="/v/atlas-ventures"
            number="10"
            title="Investor profile"
            body="Public-ish profile for an investor (fund, thesis, portfolio). Symmetric counterpart to /s/[slug]."
            cta="Open →"
          />
          <RouteCard
            href="/funder/saved"
            number="11"
            title="Saved startups"
            body="Investor's watchlist of starred startups. Sorted by most-recently-saved."
            cta="Open →"
          />
          <RouteCard
            href="/funder/connects"
            number="12"
            title="Outgoing connects"
            body="Investor's connect requests with status (pending / accepted / declined) + jump-to-thread."
            cta="Open →"
          />
          <RouteCard
            href="/u/me"
            number="13"
            title="Your profile"
            body="LinkedIn-style profile page — bio, your startups, your fund. Click avatar in nav to open."
            cta="Open →"
          />
          <RouteCard
            href="/u/me/edit"
            number="14"
            title="Edit profile + privacy"
            body="Headline, bio, social links. Privacy toggles: searchable, show startups/fund/email, hidden mode."
            cta="Open →"
          />
          <RouteCard
            href="/search?q=threadline"
            number="15"
            title="Global search"
            body="Search across startups, funds, and people. Live dropdown in nav, full results page here."
            cta="Open →"
          />
        </div>

        <section className="mt-24 rounded-2xl border border-ink/10 bg-white p-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint mb-3">
            Status
          </div>
          <ul className="space-y-2.5 text-[14px] text-ink">
            <Status status="done">Submission form (6-step, motion-rich, autosaves)</Status>
            <Status status="done">v1 deterministic scoring rubric (4 axes)</Status>
            <Status status="done">Public startup page (/s/[slug])</Status>
            <Status status="done">Founder dashboard with score gauge + gaps + matched investors</Status>
            <Status status="done">LLM-generated narrative summary + gap analysis (streamed via Suspense)</Status>
            <Status status="done">Stack Auth wired (sign-in/up/account-settings live)</Status>
            <Status status="done">Insforge SDK installed (server client ready)</Status>
            <Status status="done">Welcome / role chooser + founder workspace + project list</Status>
            <Status status="done">Insforge schema pushed (submissions, investors, saves, connect_requests)</Status>
            <Status status="done">Submissions persist via server action — form writes to Insforge</Status>
            <Status status="done">Founder side reads from Insforge (per-user, multi-project)</Status>
            <Status status="done">Investor home + thesis intake (auto-prefilled with Atlas Ventures dummy)</Status>
            <Status status="done">Discover: browseable + filtered + per-card save toggle</Status>
            <Status status="done">Audience layer: profile views tracked, sparkline, viewer list, connect inbox</Status>
            <Status status="done">Investor action bar on /s/[slug]: save + request-connect modal</Status>
            <Status status="done">Subscriber gate: LinkedIn / deck / demo URLs blurred + stripped from payload for non-subscribers</Status>
            <Status status="done">Notifications layer: bell + dropdown + polling, fires on view/save/connect/accept/decline/message</Status>
            <Status status="done">Auto-conversation on connect-accept (seeded with original message)</Status>
            <Status status="done">/messages: list + thread view + send box, 4s polling, optimistic send + read receipts</Status>
            <Status status="done">Role persisted in Stack Auth metadata — sign-in goes straight to founder or investor home</Status>
            <Status status="done">Investor profile pages /v/[slug] — clicking a fund name from anywhere lands here</Status>
            <Status status="done">Connect/save state surfaced on Discover (pending / accepted / passed / saved)</Status>
            <Status status="done">/funder/saved + /funder/connects — investor management views</Status>
            <Status status="done">Edit submission (/founder/[slug]/edit) + multi-project blank form</Status>
            <Status status="done">Email notifications via Gmail SMTP for connect requested + accepted</Status>
            <Status status="done">Auto-fetched logo (Clearbit CDN) on the submission form</Status>
            <Status status="done">User profiles (/u/[slug]) — LinkedIn-style with bio, startups, fund</Status>
            <Status status="done">Privacy controls — searchable / show startups / show fund / show email / hidden mode</Status>
            <Status status="done">Global search — live dropdown in nav + /search page across startups, funds, people</Status>
            <Status status="next">Stripe — founder + investor subscription tiers</Status>
            <Status status="next">Production deploy to app.laelapx.com</Status>
          </ul>
        </section>
      </main>
    </div>
  );
}

function RouteCard({
  href,
  number,
  title,
  body,
  cta,
}: {
  href: string;
  number: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-ink/10 bg-white p-6 transition-all hover:border-blue/40 hover:shadow-[0_8px_24px_rgba(28,43,66,0.06)] hover:-translate-y-0.5"
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue mb-3">
        {number}
      </div>
      <div className="text-[20px] font-extrabold tracking-tight text-navy">
        {title}
      </div>
      <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-soft">
        {body}
      </p>
      <div className="mt-5 text-[13px] font-bold text-blue transition-colors group-hover:text-blue-light">
        {cta}
      </div>
    </Link>
  );
}

function Status({
  status,
  children,
}: {
  status: "done" | "next";
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-baseline gap-3">
      <span
        className={`mt-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
          status === "done"
            ? "bg-flag-green/15 text-flag-green"
            : "bg-blue/15 text-blue"
        }`}
      >
        {status === "done" ? "✓" : "→"}
      </span>
      <span className={status === "done" ? "text-ink" : "text-ink-soft"}>
        {children}
      </span>
    </li>
  );
}
