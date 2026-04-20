import type { ChatMessage } from "@/lib/types/chat";

/** Fields needed to decide whether the book-kickoff UI should be hidden (restored / progressed thread). */
export type BookKickoffThreadSnapshot = {
  awaitingGate: null | "outline" | "preview" | "post_preview" | "full";
  bookOutline: Record<string, unknown> | null;
  previewContent: string;
  composerStep: "intake" | "outline" | "preview";
  messages: ChatMessage[];
};

/**
 * True once outline or preview work exists — do not show “build it together” / concept buttons.
 */
export function threadPastBookKickoff(ctx: BookKickoffThreadSnapshot): boolean {
  const { awaitingGate, bookOutline, previewContent, composerStep, messages } = ctx;
  if (
    awaitingGate === "outline" ||
    awaitingGate === "preview" ||
    awaitingGate === "post_preview" ||
    awaitingGate === "full"
  ) {
    return true;
  }
  if (bookOutline != null && Object.keys(bookOutline).length > 0) return true;
  if (previewContent.trim().length > 0) return true;
  if (composerStep === "outline" || composerStep === "preview") return true;
  return messages.some(
    (m) =>
      m.role === "assistant" &&
      (m.kind === "outline" || m.kind === "preview"),
  );
}
