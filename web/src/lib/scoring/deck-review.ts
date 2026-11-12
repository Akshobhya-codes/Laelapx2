import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { getOpenAI, VISION_MODEL } from "@/lib/ai/openai";
import type { Submission } from "@/lib/submission/schema";
import type { DeckReviewBody, SlideVerdict, StoredDeckReview } from "@/lib/insforge/founder-tools";

/**
 * Deep deck review (Laelapx+). Downloads the founder's deck PDF and has the
 * vision model read it slide by slide, with the structured submission as
 * context. Each run is stored, so the dashboard can show how the deck
 * improved between iterations.
 *
 * The URL comes from the founder, so fetching it is guarded: https only,
 * no private / loopback / link-local addresses, re-checked on every
 * redirect hop, size-capped, and the body must actually be a PDF.
 */

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const FETCH_TIMEOUT_MS = 25_000;

/** Monthly cap per founder. Each run costs a vision-model call on a full PDF. */
export const DECK_REVIEWS_PER_MONTH = 10;

/* ─── URL HANDLING ───────────────────────────────────────────────────── */

/** Turn common "share" links into direct-download links. */
export function normalizeDeckUrl(raw: string): string {
  const url = raw.trim();
  // Google Drive file: /file/d/<id>/view
  let m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  // Google Drive open?id=<id>
  m = url.match(/drive\.google\.com\/open\?id=([\w-]+)/);
  if (m) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
  // Google Slides → PDF export
  m = url.match(/docs\.google\.com\/presentation\/d\/([\w-]+)/);
  if (m) return `https://docs.google.com/presentation/d/${m[1]}/export/pdf`;
  // Dropbox: force download
  if (/dropbox\.com\//.test(url)) {
    const u = new URL(url);
    u.searchParams.set("dl", "1");
    return u.toString();
  }
  return url;
}

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) // carrier-grade NAT
    );
  }
  const v6 = ip.toLowerCase();
  return (
    v6 === "::1" ||
    v6 === "::" ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("fe80") ||
    v6.startsWith("::ffff:127.") ||
    v6.startsWith("::ffff:10.") ||
    v6.startsWith("::ffff:192.168.")
  );
}

async function assertPublicHttps(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new DeckFetchError("That isn't a valid link.");
  }
  if (u.protocol !== "https:") throw new DeckFetchError("The deck link must start with https://.");
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new DeckFetchError("That link points to a private address.");
  }
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addrs.length === 0) throw new DeckFetchError("We couldn't reach that host.");
  if (addrs.some((a) => isPrivateAddress(a.address))) {
    throw new DeckFetchError("That link points to a private address.");
  }
  return u;
}

export class DeckFetchError extends Error {}

/** Download the deck as a PDF buffer, or throw DeckFetchError with a founder-readable reason. */
export async function fetchDeckPdf(deckUrl: string): Promise<Buffer> {
  let current = normalizeDeckUrl(deckUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = await assertPublicHttps(current);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(u, { redirect: "manual", signal: ctrl.signal, headers: { Accept: "application/pdf,*/*" } });
    } catch {
      throw new DeckFetchError("The deck link didn't respond in time.");
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new DeckFetchError("The deck link redirected nowhere.");
      current = new URL(loc, u).toString();
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      throw new DeckFetchError("The deck isn't public. Set sharing to “Anyone with the link can view”.");
    }
    if (!res.ok) throw new DeckFetchError(`The deck link returned an error (${res.status}).`);

    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) throw new DeckFetchError("The deck is over 20 MB. Export a lighter PDF.");

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new DeckFetchError("The deck is over 20 MB. Export a lighter PDF.");
    if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
      throw new DeckFetchError(
        "That link opens a web page, not a PDF. Use a direct PDF link — Google Drive or Slides (shared to anyone with the link), Dropbox, or a URL ending in .pdf. DocSend and Pitch links can't be read."
      );
    }
    return buf;
  }
  throw new DeckFetchError("The deck link redirected too many times.");
}

/* ─── REVIEW ─────────────────────────────────────────────────────────── */

const SYSTEM = `You are a partner at an early-stage venture fund reviewing a founder's pitch deck before a first meeting.
Read every slide. Be specific and terse: quote numbers and claims from the deck, name what's missing, and say exactly how to fix it.
No praise filler, no emojis, no "great job". Judge the deck as an investor would, against the stated stage.

Return JSON only, exactly this shape:
{
  "deckScore": 0-100 integer — how ready this deck is for an investor at this stage,
  "summary": "2-3 sentences: the overall read of the deck",
  "storyline": "1-2 sentences on whether the narrative flows (problem → solution → why now → market → traction → team → ask) and where it breaks",
  "slides": [ { "index": 1-based slide number, "title": "short slide title", "verdict": "strong" | "ok" | "weak", "note": "one sentence, specific" } ],
  "missing": [ "slides or evidence an investor expects but the deck lacks" ],
  "topFixes": [ { "title": "4-8 words", "why": "one sentence on why an investor cares", "fix": "one sentence, concrete" } ]
}
topFixes: 3 to 5, most important first.`;

function clampScore(n: unknown): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
}

function sanitize(raw: unknown): { score: number; body: DeckReviewBody } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const verdicts: SlideVerdict[] = ["strong", "ok", "weak"];
  const slides = Array.isArray(r.slides)
    ? r.slides
        .map((s, i) => {
          const o = (s ?? {}) as Record<string, unknown>;
          return {
            index: Number.isFinite(Number(o.index)) ? Number(o.index) : i + 1,
            title: String(o.title ?? `Slide ${i + 1}`).slice(0, 80),
            verdict: verdicts.includes(o.verdict as SlideVerdict) ? (o.verdict as SlideVerdict) : "ok",
            note: String(o.note ?? "").slice(0, 400),
          };
        })
        .slice(0, 40)
    : [];
  const topFixes = Array.isArray(r.topFixes)
    ? r.topFixes
        .map((f) => {
          const o = (f ?? {}) as Record<string, unknown>;
          return {
            title: String(o.title ?? "").slice(0, 100),
            why: String(o.why ?? "").slice(0, 400),
            fix: String(o.fix ?? "").slice(0, 400),
          };
        })
        .filter((f) => f.title && f.fix)
        .slice(0, 6)
    : [];
  return {
    score: clampScore(r.deckScore),
    body: {
      summary: String(r.summary ?? "").slice(0, 800),
      storyline: String(r.storyline ?? "").slice(0, 600),
      slides,
      missing: Array.isArray(r.missing) ? r.missing.map((m) => String(m).slice(0, 200)).slice(0, 10) : [],
      topFixes,
    },
  };
}

export async function reviewDeck(input: {
  pdf: Buffer;
  submission: Submission;
  previous: StoredDeckReview | null;
}): Promise<{ score: number; body: DeckReviewBody; model: string }> {
  const s = input.submission;
  const context = [
    `Company: ${s.companyName} — ${s.oneLiner}`,
    `Stage: ${s.stage}; raising $${s.raisingUsd.toLocaleString()} (${s.roundType})`,
    `Sectors: ${s.sectors.join(", ")}`,
    `Traction: ${s.customerCount} customers, MRR ${s.mrrUsd ? `$${s.mrrUsd.toLocaleString()}` : "n/a"}, MoM ${s.momGrowthPct ?? "n/a"}%`,
  ].join("\n");

  // Iteration feedback: tell the model what it flagged last time so it can
  // say whether those were fixed rather than starting from zero.
  const prior =
    input.previous?.review && input.previous.deckScore !== null
      ? `\n\nThis is a revised deck. The previous version scored ${input.previous.deckScore}. Its top fixes were:\n${input.previous.review.topFixes
          .map((f) => `- ${f.title}: ${f.fix}`)
          .join("\n")}\nIn "summary", say plainly which of these were addressed and which were not.`
      : "";

  const res = await getOpenAI().chat.completions.create({
    model: VISION_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 3000,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: `Founder's submission, for context:\n${context}${prior}\n\nReview the attached deck.` },
          {
            type: "file",
            file: {
              filename: `${s.companyName.replace(/[^\w-]+/g, "_") || "deck"}.pdf`,
              file_data: `data:application/pdf;base64,${input.pdf.toString("base64")}`,
            },
          },
        ],
      },
    ],
  });

  const raw = res.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from the model");
  const { score, body } = sanitize(JSON.parse(raw));
  return { score, body, model: VISION_MODEL };
}
