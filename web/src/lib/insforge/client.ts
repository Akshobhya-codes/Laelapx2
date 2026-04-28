import "server-only";
import { createClient } from "@insforge/sdk";

/**
 * Server-only Insforge client.
 *
 * Per the project dashboard, the Insforge `ik_` API key has full access
 * control and must NOT reach the browser bundle. We always run the SDK in
 * server mode (cookies for auth, no client-persisted session).
 *
 * Lazy-init so test/build runs without env don't crash on import.
 */
let _client: ReturnType<typeof createClient> | null = null;

export function getInsforge() {
  if (_client) return _client;

  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Insforge env not set. Add NEXT_PUBLIC_INSFORGE_URL and INSFORGE_API_KEY to web/.env.local."
    );
  }

  _client = createClient({
    baseUrl,
    anonKey: apiKey,
    isServerMode: true,
  });
  return _client;
}
