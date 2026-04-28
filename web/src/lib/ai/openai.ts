import OpenAI from "openai";

/**
 * Server-only OpenAI client. Lazy-initialized so test/build environments
 * without the env var don't crash on import.
 */
let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (_client) return _client;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY missing. Add it to web/.env.local and restart dev."
    );
  }
  _client = new OpenAI({ apiKey: key });
  return _client;
}

export const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
export const VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-4o";

/* ─── Helpers ─────────────────────────────────────────────────────────── */

/**
 * Plain-text completion. Strips wrapping whitespace.
 */
export async function completeText(opts: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const client = getOpenAI();
  const res = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    temperature: opts.temperature ?? 0.5,
    max_tokens: opts.maxTokens ?? 400,
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * JSON-only completion. Forces JSON mode and parses. Throws on parse failure
 * so callers can fall back cleanly.
 */
export async function completeJson<T>(opts: {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const client = getOpenAI();
  const res = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    response_format: { type: "json_object" },
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 1200,
  });
  const raw = res.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from OpenAI");
  return JSON.parse(raw) as T;
}
