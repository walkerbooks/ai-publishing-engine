import type { ChatMessage } from "@/lib/types/chat";
import {
  VIDEO_BLOCK_HEADING,
  WELCOME_OPTIONS_ASK_NAME,
} from "@/lib/constants/welcome";

export function shouldInjectVideoBlock(messages: ChatMessage[]): boolean {
  if (messages.some((m) => m.videos?.length)) return false;
  if (messages.length !== 4) return false;
  const first = messages[0];
  const last = messages[3];
  return (
    first?.role === "user" &&
    !!first.content &&
    WELCOME_OPTIONS_ASK_NAME.includes(first.content)
    &&
    last?.role === "assistant" &&
    !last.content.trim().startsWith("[")
  );
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
    WELCOME_OPTIONS_ASK_NAME.includes(a.content) &&
    b.role === "assistant" &&
    c.role === "user"
  ) {
    const n = c.content.trim();
    return n || null;
  }
  return null;
}
