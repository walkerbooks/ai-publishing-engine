const KEY = "ai_pub_guest_device_token";

let memoryToken: string | null = null;

/** Stable per-browser id sent to Go so start-session can reuse the same guest row. */
export function getOrCreateGuestDeviceToken(): string {
  if (typeof window === "undefined") return "";
  try {
    let t = localStorage.getItem(KEY);
    if (!t?.trim()) {
      t = crypto.randomUUID();
      localStorage.setItem(KEY, t);
    }
    return t;
  } catch {
    if (!memoryToken) memoryToken = crypto.randomUUID();
    return memoryToken;
  }
}
