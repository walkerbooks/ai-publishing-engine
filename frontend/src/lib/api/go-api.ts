/** Browser calls this path; Next.js proxies to the Go API (see `app/api/go/[...path]/route.ts`). */
export const GO_API_PREFIX = "/api/go";

/**
 * Headers for authenticated Go API calls from the browser.
 * Sends `X-Access-Token` as well as `Authorization` so the Next proxy can recover auth if
 * `Authorization` is dropped; Go should read `Authorization` (proxy merges from X-Access-Token).
 */
export function goAuthHeaders(accessToken: string): HeadersInit {
  const t = accessToken.trim();
  const raw = t.toLowerCase().startsWith("bearer ") ? t.slice(7).trim() : t;
  if (!raw) {
    return { Accept: "application/json" };
  }
  return {
    Accept: "application/json",
    Authorization: `Bearer ${raw}`,
    "X-Access-Token": raw,
  };
}
