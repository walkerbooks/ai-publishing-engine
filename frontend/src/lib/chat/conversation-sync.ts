import { appendConversationMessage, createConversation } from "@/lib/api/conversation-client";
import { chatMessageToAppendBody } from "@/lib/chat/conversation-mappers";
import {
  applyPublishingSnapshot,
  deriveConversationTitle,
  publishingToSnapshot,
} from "@/lib/chat/session-serialization";
import { getAccessToken } from "@/lib/auth/access-token";
import { getLogger } from "@/lib/log";
import { useAuthStore } from "@/stores/auth-store";
import type { StoredConversation } from "@/stores/chat-directory-store";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { createInitialPublishingState } from "@/stores/publishing-types";
import { usePublishingStore } from "@/stores/publishing-store";
import type { ChatMessage } from "@/lib/types/chat";

const log = getLogger("conversation-sync");

function sortStoredConversations(list: StoredConversation[]): StoredConversation[] {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * After guest → login, the active thread may still use a local-only id. Create a server
 * conversation, point the UI at it, sync sessionId, and backfill messages so PayPal / append work.
 */
export async function promoteActiveGuestConversationToServer(): Promise<void> {
  const token = getAccessToken();
  if (!token || !useAuthStore.getState().isAuthenticated) return;

  const dir = useChatDirectoryStore.getState();
  const activeId = dir.activeConversationId;
  if (!activeId) return;

  const row = dir.conversations.find((c) => c.id === activeId);
  if (!row || row.serverBacked === true) return;

  const pub = usePublishingStore.getState();
  const titleRaw = deriveConversationTitle(publishingToSnapshot(pub)) || row.title || "Conversation";
  const title = titleRaw.slice(0, 180);

  try {
    const c = await createConversation(token, title);
    const newId = c.public_id;

    useChatDirectoryStore.setState((s) => {
      const rest = s.conversations.filter((x) => x.id !== activeId && x.id !== newId);
      const nextRow: StoredConversation = {
        id: newId,
        title: c.title,
        updatedAt: Date.parse(c.updated_at) || Date.now(),
        snapshot: null,
        serverBacked: true,
      };
      return {
        conversations: sortStoredConversations([nextRow, ...rest]),
        activeConversationId: newId,
      };
    });

    usePublishingStore.setState({ sessionId: newId });

    for (const msg of pub.chatMessages) {
      const body = chatMessageToAppendBody(msg);
      const text = body.content?.trim() ?? "";
      const hasPayload =
        text.length > 0 ||
        Boolean(body.outline_json) ||
        Boolean(body.videos_json) ||
        Boolean(body.preview_markdown);
      if (!hasPayload) continue;
      await appendConversationMessage(token, newId, body);
    }
  } catch (e) {
    log.warning("promoteActiveGuestConversationToServer failed", e);
  }
}

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
  if (!msg.content.trim()) {
    log.warning("persistChatMessageIfAuthenticated: skip empty content");
    return;
  }
  try {
    await appendConversationMessage(token, publicId, chatMessageToAppendBody(msg));
  } catch (e) {
    log.warning("persistChatMessageIfAuthenticated failed", e);
  }
}
