import { getBook } from "@/lib/api/books-client";
import { appendConversationMessage, createConversation } from "@/lib/api/conversation-client";
import { chatMessageToAppendBody } from "@/lib/chat/conversation-mappers";
import {
  applyPublishingSnapshot,
  deriveConversationTitle,
  publishingToSnapshot,
} from "@/lib/chat/session-serialization";
import { getAccessToken } from "@/lib/auth/access-token";
import { getLogger } from "@/lib/log";
import {
  clearPayPalCheckoutContext,
  readPayPalCheckoutContext,
} from "@/lib/paypal/checkout-session";
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

/** `selectConversation` requires a directory row; list APIs may omit a convo until next refresh. */
function ensureServerConversationListed(conversationPublicId: string): void {
  useChatDirectoryStore.setState((s) => {
    if (s.conversations.some((c) => c.id === conversationPublicId)) {
      return {};
    }
    const nextRow: StoredConversation = {
      id: conversationPublicId,
      title: "Conversation",
      updatedAt: Date.now(),
      snapshot: null,
      serverBacked: true,
    };
    return {
      conversations: sortStoredConversations([nextRow, ...s.conversations]),
    };
  });
}

/**
 * After guest → login, the active thread may still use a local-only id. Create a server
 * conversation, point the UI at it, sync sessionId, and backfill messages so PayPal / append work.
 */
export async function promoteActiveGuestConversationToServer(): Promise<void> {
  const token = getAccessToken();
  if (!token || !useAuthStore.getState().isAuthenticated) return;

  useChatDirectoryStore.getState().upsertActiveFromPublishing(usePublishingStore.getState());

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
      const body = chatMessageToAppendBody(
        msg,
        msg.kind === "cover" ? pub.activeBookId : null,
      );
      const text = body.content?.trim() ?? "";
      const hasPayload =
        text.length > 0 ||
        Boolean(body.outline_json) ||
        Boolean(body.videos_json) ||
        Boolean(body.preview_markdown) ||
        Boolean(body.book_spec_json) ||
        Boolean(body.cover_image_png);
      if (!hasPayload) continue;
      await appendConversationMessage(token, newId, body);
    }
  } catch (e) {
    log.warning("promoteActiveGuestConversationToServer failed", e);
  }
}

/**
 * After PayPal, the app reloads at /chat?book=… with an empty client. Prefer the book’s
 * `conversation_public_id` from Go; fall back to sessionStorage from checkout if missing.
 */
export async function restorePayPalThreadAfterReturn(
  bookFromUrl: string | null,
): Promise<void> {
  const token = getAccessToken();
  const book = bookFromUrl?.trim() ?? "";
  if (!token || !useAuthStore.getState().isAuthenticated || !book) return;

  let convId: string | null = null;
  try {
    const b = await getBook(book, token);
    const fromApi = b.conversation_public_id?.trim();
    if (fromApi) convId = fromApi;
  } catch (e) {
    log.debug("restorePayPalThreadAfterReturn: getBook failed", {
      err: e instanceof Error ? e.message : String(e),
    });
  }

  if (!convId) {
    const ctx = readPayPalCheckoutContext();
    if (!ctx || ctx.book_public_id !== book) return;
    convId = ctx.conversation_public_id?.trim() ?? null;
    if (!convId) {
      clearPayPalCheckoutContext();
      return;
    }
  }

  ensureServerConversationListed(convId);

  const dir = useChatDirectoryStore.getState();
  await dir.selectConversation(convId);
  if (useChatDirectoryStore.getState().activeConversationId !== convId) {
    return;
  }

  usePublishingStore.getState().setActiveBookId(book);
  usePublishingStore.setState({ bookPreviewRowSynced: true });
  clearPayPalCheckoutContext();
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

/**
 * POSTs the message to Go when the user is authenticated.
 * @returns true if nothing to do (guest) or append succeeded; false if logged in but the save failed.
 */
export async function persistChatMessageIfAuthenticated(msg: ChatMessage): Promise<boolean> {
  const token = getAccessToken();
  if (!token || !useAuthStore.getState().isAuthenticated) {
    return true;
  }
  const publicId = useChatDirectoryStore.getState().activeConversationId;
  if (!publicId) {
    log.warning("persistChatMessageIfAuthenticated: no activeConversationId");
    return false;
  }
  if (!msg.content.trim()) {
    log.warning("persistChatMessageIfAuthenticated: skip empty content");
    return false;
  }
  try {
    const linkBook =
      msg.kind === "cover" ? usePublishingStore.getState().activeBookId : null;
    const row = await appendConversationMessage(
      token,
      publicId,
      chatMessageToAppendBody(msg, linkBook),
    );
    if (!row) {
      log.warning("persistChatMessageIfAuthenticated: append returned null");
      return false;
    }
    return true;
  } catch (e) {
    log.warning("persistChatMessageIfAuthenticated failed", e);
    return false;
  }
}
