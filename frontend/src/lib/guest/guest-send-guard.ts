import { getGuestMaxConversations, guestConversationLimitCopy } from "@/lib/guest/guest-config";
import { useAuthStore } from "@/stores/auth-store";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { usePublishingStore } from "@/stores/publishing-store";

export type GuestSendGate = { ok: true } | { ok: false; message: string };

/**
 * Block starting a *new* guest thread when this session already has the max number of
 * local (non-server) conversations. Continuing the active thread is always allowed.
 */
export function assertGuestMaySendNewThread(): GuestSendGate {
  if (useAuthStore.getState().isAuthenticated) return { ok: true };

  const max = getGuestMaxConversations();
  if (max <= 0) return { ok: true };

  const { conversations, activeConversationId } = useChatDirectoryStore.getState();
  const { chatMessages } = usePublishingStore.getState();

  const localCount = conversations.filter((c) => c.serverBacked !== true).length;

  if (activeConversationId) return { ok: true };

  if (chatMessages.length > 0) return { ok: true };

  if (localCount >= max) {
    return { ok: false, message: guestConversationLimitCopy(max) };
  }

  return { ok: true };
}
