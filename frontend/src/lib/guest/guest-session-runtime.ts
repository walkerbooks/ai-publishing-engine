/**
 * Optional limits returned by POST /v1/guest/start-session (takes precedence over env).
 * `undefined` = not loaded yet or request failed (fall back to NEXT_PUBLIC_GUEST_MAX_CONVERSATIONS).
 * `null` = server responded but omitted max (fall back to env).
 * `number` = effective cap (0 = unlimited).
 */
let serverMaxOverride: number | null | undefined;

export function setGuestServerMaxOverride(value: number | null | undefined): void {
  serverMaxOverride = value;
}

export function getGuestServerMaxOverride(): number | null | undefined {
  return serverMaxOverride;
}
