import {
  createInitialPublishingState,
  type PublishingState,
} from "@/stores/publishing-types";

/** Serializable session payload for storage and restore (mirrors publishing state). */
export type ChatSessionSnapshot = PublishingState;

export function publishingToSnapshot(state: PublishingState): ChatSessionSnapshot {
  return JSON.parse(JSON.stringify(state)) as ChatSessionSnapshot;
}

export function applyPublishingSnapshot(
  setState: (partial: Partial<PublishingState>) => void,
  snapshot: ChatSessionSnapshot,
): void {
  setState({
    ...createInitialPublishingState(),
    ...snapshot,
  });
}

export function deriveConversationTitle(snapshot: ChatSessionSnapshot): string {
  const outline = snapshot.bookOutline as Record<string, unknown> | null;
  const spec = snapshot.bookSpec as Record<string, unknown> | null;
  const fromOutline =
    outline && typeof outline.book_title === "string"
      ? outline.book_title.trim()
      : "";
  const fromSpec =
    spec && typeof spec.title === "string" ? spec.title.trim() : "";
  const firstUser = snapshot.chatMessages.find((m) => m.role === "user");
  const fromMsg = firstUser?.content?.trim().slice(0, 56) ?? "";
  return fromOutline || fromSpec || fromMsg || "New conversation";
}
