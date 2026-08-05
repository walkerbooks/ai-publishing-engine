import type { ChatMessage } from "@/lib/types/chat";

/**
 * Guest name inline field: first assistant turn in intake is always the “what’s your name” step
 * for signed-out users (see api/agents/prompts/intake.py). We key off conversation shape
 * `[user, assistant]` + intake kind — no English phrase list.
 *
 * If the model ever skips straight to book topics on turn 1, prefer a future
 * `kind` / metadata from the API instead of restoring string matching here.
 */
export function isGuestNameCaptureTurn(
  messages: ChatMessage[],
  assistantMessageIndex: number,
): boolean {
  if (messages.length !== 2 || assistantMessageIndex !== 1) return false;
  const m0 = messages[0];
  const m1 = messages[1];
  if (m0?.role !== "user" || !m0.content.trim()) return false;
  if (m1?.role !== "assistant") return false;
  const k = m1.kind ?? "intake";
  if (k !== "intake" && m1.kind) return false;
  return true;
}

/**
 * Guest onboarding: user → assistant (name) → user (name) → assistant (thanks + asks for email).
 * After this assistant message we show inline email capture below the bubble.
 * Also matches when the last assistant turn clearly asks for email and the guest has not
 * submitted one yet (covers slight turn-count drift).
 */
export function shouldShowGuestEmailCapture(messages: ChatMessage[]): boolean {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") return false;
  const k = last.kind ?? "intake";
  if (k !== "intake") return false;
  const content = last.content.trim();
  if (!content || content.startsWith("[")) return false;

  if (messages.length === 4) {
    const [m0, m1, m2, m3] = messages;
    if (
      m0.role === "user" &&
      Boolean(m0.content.trim()) &&
      m1.role === "assistant" &&
      m2.role === "user" &&
      Boolean(m2.content.trim()) &&
      m3.role === "assistant"
    ) {
      return true;
    }
  }

  if (messages.length >= 4) {
    const nameUser = messages[2];
    if (nameUser?.role !== "user" || !nameUser.content.trim()) return false;
    const alreadyGaveEmail = messages
      .slice(3)
      .some((m) => m.role === "user" && m.content.includes("@"));
    if (alreadyGaveEmail) return false;
    return assistantAsksForGuestEmail(content);
  }

  return false;
}

function assistantAsksForGuestEmail(content: string): boolean {
  const s = content.toLowerCase();
  if (!s.includes("email") && !s.includes("e-mail")) return false;
  return (
    s.includes("share") ||
    s.includes("send you") ||
    s.includes("address") ||
    s.includes("could you") ||
    s.includes("what's your") ||
    s.includes("what is your") ||
    s.includes("please")
  );
}

/** True once welcome video fetch completed, or the message already has videos (e.g. hydrated). */
export function isWelcomeVideosSettledForMessage(m: ChatMessage | undefined): boolean {
  if (!m) return false;
  if (m.welcomeVideosSettled === true) return true;
  return Boolean(m.videos?.length);
}

/**
 * When guest name or guest email inline fields would apply, the main dock composer is disabled
 * so the user must use the inline fields once they appear (after `busy` is false).
 */
export function shouldDisableDockComposerForGuestInlineCapture(
  messages: ChatMessage[],
  isAuthenticated: boolean,
): boolean {
  if (isAuthenticated || messages.length === 0) return false;
  const last = messages.at(-1);
  if (!last || last.role !== "assistant") return false;
  const kind = last.kind ?? "intake";
  if (kind !== "intake" && last.kind) return false;
  if (isGuestNameCaptureTurn(messages, messages.length - 1)) return true;
  if (shouldShowGuestEmailCapture(messages)) return true;
  return false;
}

export type WelcomeVideosOptions = {
  /** Logged-in user: first assistant reply already includes "Hi {name}, …" — attach videos there (2 messages). */
  skipNameOnboarding?: boolean;
};

/**
 * Attach the YouTube welcome row once:
 * - Logged-in (skipNameOnboarding): user → assistant (2 messages), videos on that assistant bubble.
 * - Guest: user → assistant → user (name) → assistant (4 messages), videos on that assistant only.
 * Do not attach again on later turns (e.g. after the guest sends email) — that duplicated the block.
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

  // Guest path: videos only on the assistant message right after the user gives their name (4 messages)
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
