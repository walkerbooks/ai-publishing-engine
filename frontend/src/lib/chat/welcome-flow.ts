import type { ChatMessage } from "@/lib/types/chat";
import { VIDEO_BLOCK_HEADING, WELCOME_OPTIONS } from "@/lib/constants/welcome";

const welcomePick = (content: string) =>
  (WELCOME_OPTIONS as readonly string[]).includes(content);

/**
 * After: user quick-pick → assistant → user (name) → assistant (first real reply),
 * inject the YouTube block once. Any of the three welcome pills qualifies (not only the first two).
 */
export function shouldInjectVideoBlock(messages: ChatMessage[]): boolean {
  if (messages.some((m) => m.videos?.length)) return false;
  if (messages.length !== 4) return false;
  const [m0, m1, m2, m3] = messages;
  if (m0?.role !== "user" || !m0.content || !welcomePick(m0.content)) return false;
  if (m1?.role !== "assistant") return false;
  if (m2?.role !== "user" || !m2.content.trim()) return false;
  if (m3?.role !== "assistant") return false;
  const last = m3.content.trim();
  if (!last || last.startsWith("[")) return false;
  return true;
}

export function buildVideoAssistantMessage(
  videos: { title: string; link: string; thumbnail_url?: string }[],
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    kind: "intake",
    content: VIDEO_BLOCK_HEADING,
    videos: videos.slice(0, 3),
  };
}

export function extractUserNameFromMessages(
  messages: ChatMessage[],
): string | null {
  if (messages.length !== 3) return null;
  const [a, b, c] = messages;
  if (
    a.role === "user" &&
    welcomePick(a.content) &&
    b.role === "assistant" &&
    c.role === "user"
  ) {
    const n = c.content.trim();
    return n || null;
  }
  return null;
}
