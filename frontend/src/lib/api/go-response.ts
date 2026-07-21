/**
 * Shared Go proxy error handling. Uses dynamic import for 401 handling to avoid
 * circular deps (auth-store → auth-client → this module → auth store).
 */

export async function readGoErrorMessage(res: Response): Promise<string> {
  const t = await res.text();
  const trimmed = t.trim();
  try {
    const j = JSON.parse(trimmed) as { error?: string };
    if (j.error) return j.error;
  } catch {
    /* */
  }
  // Next/proxy HTML error pages must not surface in login banners.
  if (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    /<html[\s>]/i.test(trimmed)
  ) {
    if (res.status === 404) {
      return "API unavailable (404). Is the Next.js proxy and Go backend running?";
    }
    return `API request failed (HTTP ${res.status}). Try again in a moment.`;
  }
  return trimmed || `Request failed: ${res.status}`;
}

/** Read body, invalidate session on 401, then throw with the error message. */
export async function throwIfGoResponseFailed(res: Response): Promise<never> {
  const msg = await readGoErrorMessage(res);
  if (res.status === 401) {
    const { invalidateGoSession } = await import("@/lib/auth/invalidate-go-session");
    invalidateGoSession(msg);
  }
  throw new Error(msg);
}
