import type { ChatMessage } from "@/lib/types/chat";

/**
 * After first user message → assistant → user (name) → assistant reply finishes:
 * auto-attach YouTube row to that assistant message (no extra bubble).
 */
export function shouldAttachWelcomeVideos(messages: ChatMessage[]): boolean {
  if (messages.length !== 4) return false;
  const [m0, m1, m2, m3] = messages;
  if (m3.videos?.length) return false;
  if (m0?.role !== "user" || !m0.content.trim()) return false;
  if (m1?.role !== "assistant") return false;
  if (m2?.role !== "user" || !m2.content.trim()) return false;
  if (m3?.role !== "assistant") return false;
  const last = m3.content.trim();
  if (!last || last.startsWith("[")) return false;
  return true;
}

/** Intake: first user turn → assistant → second user turn is treated as name. */
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
