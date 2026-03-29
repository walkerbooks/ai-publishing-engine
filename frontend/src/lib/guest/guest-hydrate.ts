import { applyPublishingSnapshot } from "@/lib/chat/session-serialization";
import { loadPersistedGuestDirectory } from "@/lib/guest/guest-directory-persist";
import { createInitialPublishingState } from "@/stores/publishing-types";
import { useAuthStore } from "@/stores/auth-store";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { usePublishingStore } from "@/stores/publishing-store";

/** Restore guest conversations from localStorage (only when logged out and store is empty). */
export function hydrateGuestStoresFromPersistence(): void {
  if (useAuthStore.getState().isAuthenticated) return;
  const loaded = loadPersistedGuestDirectory();
  if (!loaded?.conversations.length) return;
  if (useChatDirectoryStore.getState().conversations.length > 0) return;

  useChatDirectoryStore.setState({
    conversations: loaded.conversations,
    activeConversationId: loaded.activeConversationId,
    listLoaded: true,
  });

  const activeId = loaded.activeConversationId;
  const row = activeId
    ? loaded.conversations.find((c) => c.id === activeId)
    : loaded.conversations[0];
  if (row?.snapshot) {
    applyPublishingSnapshot(usePublishingStore.setState, row.snapshot);
  } else {
    usePublishingStore.setState(createInitialPublishingState());
  }
}
