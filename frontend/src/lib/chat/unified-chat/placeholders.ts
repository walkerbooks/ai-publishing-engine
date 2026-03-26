import type { ChatBlockKind } from "@/lib/types/chat";

export const THINKING = [
  "[adding spice...]",
  "[gathering information...]",
  "[thinking through your book...]",
  "[drafting the next message...]",
] as const;

export const OUTLINE_THINKING = "[generating outline...]" as const;
export const PREVIEW_THINKING = "[writing preview markdown...]" as const;

export function getUnifiedAssistantPlaceholder(
  kind: ChatBlockKind,
  content?: unknown,
): string {
  if (typeof content === "string" && content.trim().length > 0) return content;
  if (kind === "outline") return OUTLINE_THINKING;
  if (kind === "preview") return PREVIEW_THINKING;
  const idx = Math.floor(Math.random() * THINKING.length);
  return THINKING[idx] as string;
}

