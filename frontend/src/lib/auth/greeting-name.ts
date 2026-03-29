/**
 * Name to use in intake greetings when the user is logged in (from /auth/me + session).
 */
export function authGreetingName(
  isAuthenticated: boolean,
  firstName: string | null,
  email: string | null,
): string | null {
  if (!isAuthenticated) return null;
  const fn = firstName?.trim();
  if (fn) return fn;
  const local = email?.split("@")[0]?.trim();
  if (local) return local;
  return "there";
}

/**
 * For UI copy only: a real label (first name or email local part), or null if none.
 * Use when you don't want a generic fallback like "there".
 */
export function authGreetingLabelForUi(
  isAuthenticated: boolean,
  firstName: string | null,
  email: string | null,
): string | null {
  if (!isAuthenticated) return null;
  const fn = firstName?.trim();
  if (fn) return fn;
  const local = email?.split("@")[0]?.trim();
  return local || null;
}
