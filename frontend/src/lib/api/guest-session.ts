import { GO_API_PREFIX } from "@/lib/api/go-api";
import { getAccessToken } from "@/lib/auth/access-token";
import { getLogger } from "@/lib/log";

const log = getLogger("guest-session");

/** Ensures an HttpOnly guest cookie exists for Go book APIs when the user is not logged in. */
export async function ensureGuestSession(): Promise<void> {
  if (typeof window === "undefined") return;
  if (getAccessToken()) return;
  try {
    const res = await fetch(`${GO_API_PREFIX}/v1/guest/start-session`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      log.warning(`ensureGuestSession: HTTP ${res.status}`);
    }
  } catch (e) {
    log.warning("ensureGuestSession failed", e);
  }
}
