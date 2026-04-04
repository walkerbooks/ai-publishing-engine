import type { ChatMessage } from "@/lib/types/chat";

export type WelcomeVideosOptions = {
  /** Logged-in user: first assistant reply already includes "Hi {name}, …" — attach videos there (2 messages). */
  skipNameOnboarding?: boolean;
};

/**
 * After first user message → assistant → user (name) → assistant → user (email) → assistant reply finishes:
 * auto-attach YouTube row to that assistant message (no extra bubble).
 * Legacy (no email step): 4 messages, last assistant gets videos.
 * When skipNameOnboarding: user → assistant only (same attachment on the assistant bubble).
 */
export function shouldAttachWelcomeVideos(
  messages: ChatMessage[],
  opts?: WelcomeVideosOptions,
): boolean {
  if (opts?.skipNameOnboarding) {
    if (messages.length !== 2) return false;
    const [m0, m1] = messages;
    if (m1.videos?.length) return false;
    if (m0?.role !== "user" || !m0.content.trim()) return false;
    if (m1?.role !== "assistant") return false;
    const last = m1.content.trim();
    if (!last || last.startsWith("[")) return false;
    return true;
  }

  const last = messages.at(-1);
  if (!last || last.role !== "assistant" || last.videos?.length) return false;
  const content = last.content.trim();
  if (!content || content.startsWith("[")) return false;

  // Legacy guest path: name only, then assistant (4 messages)
  if (messages.length === 4) {
    const [m0, m1, m2, m3] = messages;
    return (
      m0?.role === "user" &&
      Boolean(m0.content.trim()) &&
      m1?.role === "assistant" &&
      m2?.role === "user" &&
      Boolean(m2.content.trim()) &&
      m3?.role === "assistant" &&
      m3.id === last.id
    );
  }

  // Guest path with name then email: 6 messages, videos on final assistant
  if (messages.length === 6) {
    const [m0, m1, m2, m3, m4, m5] = messages;
    return (
      m0?.role === "user" &&
      Boolean(m0.content.trim()) &&
      m1?.role === "assistant" &&
      m2?.role === "user" &&
      Boolean(m2.content.trim()) &&
      m3?.role === "assistant" &&
      m4?.role === "user" &&
      Boolean(m4.content.trim()) &&
      m5?.role === "assistant" &&
      m5.id === last.id
    );
  }

  return false;
}

/** Intake: first user turn → assistant → second user turn is treated as name (legacy 3-turn). */
export function extractUserNameFromMessages(
  messages: ChatMessage[],
): string | null {
  if (messages.length !== 3) return null;
  const [a, b, c] = messages;
  if (
    a.role === "user" &&
    a.content.trim() &&
    b.role === "assistant" &&
    c.role === "user"
  ) {
    const n = c.content.trim();
    return n || null;
  }
  return null;
}

/** Sync guest name (3rd message) and email (5th message) when unified onboarding pattern matches. */
export function syncGuestOnboardingFromMessages(messages: ChatMessage[]): {
  userName: string | null;
  guestEmail: string | null;
} {
  let userName: string | null = null;
  let guestEmail: string | null = null;

  if (
    messages.length >= 3 &&
    messages[0]?.role === "user" &&
    messages[1]?.role === "assistant" &&
    messages[2]?.role === "user"
  ) {
    const n = messages[2].content.trim();
    if (n) userName = n;
  }

  if (
    messages.length >= 5 &&
    messages[4]?.role === "user"
  ) {
    const e = messages[4].content.trim();
    if (e.includes("@")) guestEmail = e;
  }

  return { userName, guestEmail };
}
