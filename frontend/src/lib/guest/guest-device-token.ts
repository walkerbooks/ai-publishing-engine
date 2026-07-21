import { newId } from "@/lib/utils/id";

const KEY = "ai_pub_guest_device_token";

let memoryToken: string | null = null;

/**
 * Per-tab session id for Go guest/start-session. sessionStorage (not localStorage) so closing
 * the tab ends the device binding; aligns with session-only guest chat (no cross-visit restore).
 */
export function getOrCreateGuestDeviceToken(): string {
  if (typeof window === "undefined") return "";
  try {
    let t = sessionStorage.getItem(KEY);
    if (!t?.trim()) {
      t = newId();
      sessionStorage.setItem(KEY, t);
    }
    return t;
  } catch {
    if (!memoryToken) memoryToken = newId();
    return memoryToken;
  }
}
