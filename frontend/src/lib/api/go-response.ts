/**
 * Shared Go proxy error handling. Uses dynamic import for 401 handling to avoid
 * circular deps (auth-store → auth-client → this module → auth store).
 */

export async function readGoErrorMessage(res: Response): Promise<string> {
  const t = await res.text();
  try {
    const j = JSON.parse(t) as { error?: string };
    if (j.error) return j.error;
  } catch {
    /* */
  }
  return t.trim() || `Request failed: ${res.status}`;
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
