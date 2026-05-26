import { GO_API_PREFIX } from "@/lib/api/go-api";
import { getAccessToken } from "@/lib/auth/access-token";
import { ensureGuestSessionWithServer } from "@/lib/api/guest-client";
import { getLogger } from "@/lib/log";

const log = getLogger("promotion-client");

/** Set after a successful POST so we do not insert duplicate rows for the same session. */
const LEAD_SYNCED_KEY = "ai_pub_promotion_lead_synced";

/**
 * Inserts one promotions row in Go when both name and email are known (guest onboarding).
 * Requires guest cookie via ensureGuestSessionWithServer.
 */
export async function syncGuestPromotionLead(
  userName: string | null,
  guestEmail: string | null,
  isAuthenticated: boolean,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (isAuthenticated || getAccessToken()) return;

  const name = userName?.trim();
  const email = guestEmail?.trim();
  if (!name || !email || !email.includes("@")) return;
  if (sessionStorage.getItem(LEAD_SYNCED_KEY) === "1") return;

  await ensureGuestSessionWithServer();

  try {
    const res = await fetch(`${GO_API_PREFIX}/v1/guest/promotions`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ name, email }),
    });
    if (!res.ok) {
      log.warning(`promotions create: HTTP ${res.status}`);
      return;
    }
    sessionStorage.setItem(LEAD_SYNCED_KEY, "1");
  } catch (e) {
    log.warning("promotions create failed", e);
  }
}
