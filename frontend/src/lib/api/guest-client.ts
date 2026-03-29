import { GO_API_PREFIX } from "@/lib/api/go-api";
import { getOrCreateGuestDeviceToken } from "@/lib/guest/guest-device-token";
import { setGuestServerMaxOverride } from "@/lib/guest/guest-session-runtime";
import { getAccessToken } from "@/lib/auth/access-token";
import { useAuthStore } from "@/stores/auth-store";
import { getLogger } from "@/lib/log";

const log = getLogger("guest-client");

function pickMaxConversations(body: unknown): number | null | undefined {
  if (body == null || typeof body !== "object") return undefined;
  const o = body as Record<string, unknown>;
  const nested =
    o.data && typeof o.data === "object"
      ? (o.data as Record<string, unknown>)
      : o.guest && typeof o.guest === "object"
        ? (o.guest as Record<string, unknown>)
        : o;
  const raw =
    nested.max_conversations ??
    nested.maxConversations ??
    nested.max_guest_conversations;
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

let startSessionInFlight: Promise<void> | null = null;

/**
 * Registers (or reuses) a guest session with Go. Sends a stable device token; forwards
 * Set-Cookie via the Next `/api/go` proxy. Server may return `max_conversations` (0 = unlimited).
 */
export function ensureGuestSessionWithServer(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (getAccessToken() || useAuthStore.getState().isAuthenticated) {
    return Promise.resolve();
  }

  if (startSessionInFlight) return startSessionInFlight;

  startSessionInFlight = (async () => {
    const device_token = getOrCreateGuestDeviceToken();
    if (!device_token) {
      setGuestServerMaxOverride(undefined);
      return;
    }
    try {
      const res = await fetch(`${GO_API_PREFIX}/v1/guest/start-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ device_token }),
      });
      if (!res.ok) {
        log.warning(`guest/start-session: HTTP ${res.status}`);
        setGuestServerMaxOverride(undefined);
        return;
      }
      let data: unknown = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      setGuestServerMaxOverride(pickMaxConversations(data));
    } catch (e) {
      log.warning("guest/start-session failed", e);
      setGuestServerMaxOverride(undefined);
    } finally {
      startSessionInFlight = null;
    }
  })();

  return startSessionInFlight;
}
