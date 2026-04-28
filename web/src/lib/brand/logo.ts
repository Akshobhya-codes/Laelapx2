/**
 * Resolve a logo URL from a startup website URL.
 *
 * Uses Clearbit's free logo CDN (no key required) for high-quality, full-color
 * logos. Falls back to Google's S2 favicon service if Clearbit's host fails
 * (we don't probe at compute time — both are public CDNs that 404 on a missing
 * domain, and the <img> onError handler in the UI handles graceful fallback).
 */

export function getDomainFromUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const u = new URL(withProtocol);
    // Drop www. prefix for cleaner logo lookups.
    return u.hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

export function getLogoUrl(rawUrl: string): string | null {
  const domain = getDomainFromUrl(rawUrl);
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}?size=256`;
}

export function getFaviconFallback(rawUrl: string): string | null {
  const domain = getDomainFromUrl(rawUrl);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}
