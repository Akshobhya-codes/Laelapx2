import "server-only";

/**
 * Fetch a public page and return its visible text + a few key URLs. Strips
 * scripts, styles, comments. Truncates aggressively so we don't blow LLM
 * context on every fund site that ships 200KB of marketing copy.
 */
export async function fetchAndCleanPage(url: string): Promise<{
  url: string;
  finalUrl: string;
  text: string;
  candidateApplyUrls: string[];
} | null> {
  try {
    const res = await fetch(url, {
      headers: {
        // Identify ourselves rather than impersonate a browser. VC sites that
        // explicitly disallow bots will see this and we'll respect the 403.
        "user-agent": "Laelapx-Bot/1.0 (+https://laelapx.com)",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8_000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return null;
    const html = await res.text();
    // Cap at ~500KB to avoid memory bombs.
    const trimmed = html.length > 500_000 ? html.slice(0, 500_000) : html;

    const candidateApplyUrls = extractApplyUrls(trimmed, res.url);
    const text = stripHtml(trimmed);

    return {
      url,
      finalUrl: res.url,
      // Cap visible text at ~12k chars so each LLM call stays cheap + fast.
      text: text.slice(0, 12_000),
      candidateApplyUrls,
    };
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

const APPLY_HINTS = [
  "apply",
  "submit",
  "pitch",
  "contact",
  "send-us",
  "send us your",
  "get in touch",
  "intake",
];

function extractApplyUrls(html: string, baseUrl: string): string[] {
  const out = new Set<string>();
  const linkRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, " ").toLowerCase();
    const lh = href.toLowerCase();
    if (
      APPLY_HINTS.some((h) => text.includes(h) || lh.includes(h))
    ) {
      try {
        out.add(new URL(href, baseUrl).toString());
      } catch {
        // ignore unparseable hrefs
      }
    }
    if (out.size >= 6) break;
  }
  return [...out];
}
