import { ensureGuestSessionWithServer } from "@/lib/api/guest-client";

/**
 * Ensures an HttpOnly guest cookie exists for Go book APIs when the user is not logged in.
 * Delegates to the same POST as bootstrap (JSON `device_token`); the legacy empty-body
 * request was rejected by Go with HTTP 400.
 */
export async function ensureGuestSession(): Promise<void> {
  await ensureGuestSessionWithServer();
}
