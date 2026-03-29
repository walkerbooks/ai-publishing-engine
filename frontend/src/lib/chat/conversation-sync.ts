import { appendConversationMessage, createConversation } from "@/lib/api/conversation-client";
import { chatMessageToAppendBody } from "@/lib/chat/conversation-mappers";
import { applyPublishingSnapshot } from "@/lib/chat/session-serialization";
import { getAccessToken } from "@/lib/auth/access-token";
import { getLogger } from "@/lib/log";
import { useAuthStore } from "@/stores/auth-store";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { createInitialPublishingState } from "@/stores/publishing-types";
import { usePublishingStore } from "@/stores/publishing-store";
import type { ChatMessage } from "@/lib/types/chat";

const log = getLogger("conversation-sync");

/** Ensure a server conversation exists before the first message when authenticated. */
export async function ensureServerConversationBeforeSend(): Promise<void> {
  const token = getAccessToken();
  if (!token || !useAuthStore.getState().isAuthenticated) return;
  if (useChatDirectoryStore.getState().activeConversationId) return;
  try {
    const pendingPrompt = usePublishingStore.getState().pendingPrompt;
    const c = await createConversation(token, "New conversation");
    applyPublishingSnapshot(usePublishingStore.setState, {
      ...createInitialPublishingState(),
      sessionId: c.public_id,
      pendingPrompt,
    });
    useChatDirectoryStore.getState().registerNewServerConversation(c);
  } catch (e) {
    log.warning("ensureServerConversationBeforeSend failed", e);
  }
}

export async function persistChatMessageIfAuthenticated(msg: ChatMessage): Promise<void> {
  const token = getAccessToken();
  if (!token || !useAuthStore.getState().isAuthenticated) return;
  const publicId = useChatDirectoryStore.getState().activeConversationId;
  if (!publicId) return;
  try {
    await appendConversationMessage(token, publicId, chatMessageToAppendBody(msg));
  } catch (e) {
    log.warning("persistChatMessageIfAuthenticated failed", e);
  }
}
