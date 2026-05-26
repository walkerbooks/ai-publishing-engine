import type { ChatMessage } from "@/lib/types/chat";

/**
 * True when the last message is the full-book card with a delivered PDF.
 * In that state we hide the dock composer and inline thread inputs — the thread is complete.
 */
export function isTerminalFullBookPdfComplete(messages: ChatMessage[]): boolean {
  const last = messages.at(-1);
  if (!last || last.role !== "assistant" || last.kind !== "full") return false;
  if (last.fullGenPhase !== "complete") return false;
  return Boolean(last.fullPdfUrl?.trim());
}
