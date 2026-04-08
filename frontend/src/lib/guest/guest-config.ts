import { getGuestServerMaxOverride } from "@/lib/guest/guest-session-runtime";

/**
 * Guest (logged-out) conversation limits — per browser profile / device storage.
 * After POST /v1/guest/start-session, the server may set `max_conversations` (0 = unlimited).
 * Otherwise use NEXT_PUBLIC_GUEST_MAX_CONVERSATIONS (default 1; 0 = unlimited for local dev).
 */
export function getGuestMaxConversations(): number {
  if (typeof window === "undefined") return 0;
  const server = getGuestServerMaxOverride();
  if (typeof server === "number" && server >= 0) return Math.floor(server);
  const raw = process.env.NEXT_PUBLIC_GUEST_MAX_CONVERSATIONS;
  if (raw === undefined || raw === "") return 1;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 1;
  return Math.floor(n);
}

export function guestConversationLimitCopy(max: number): string {
  if (max <= 1) {
    return "Free guests can have one book chat per browser session. Sign in to save chats across visits and devices.";
  }
  return `Free guests can have up to ${max} book chats per browser session. Sign in to save more and sync across devices.`;
}
