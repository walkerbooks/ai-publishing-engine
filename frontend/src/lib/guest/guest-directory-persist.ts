import type { StoredConversation } from "@/stores/chat-directory-store";

const STORAGE_KEY = "ai_pub_guest_directory_v1";

/**
 * Guest conversations are session-only (in-memory Zustand). We no longer read/write chat
 * snapshots to localStorage. `clearPersistedGuestDirectory` removes legacy keys from older
 * builds and on login.
 */

/** @deprecated No longer loads data — always returns null. */
export function loadPersistedGuestDirectory(): {
  conversations: StoredConversation[];
  activeConversationId: string | null;
} | null {
  return null;
}

/** No-op: guest directory is not persisted across reloads. */
export function scheduleGuestDirectoryPersist(
  _getState: () => {
    conversations: StoredConversation[];
    activeConversationId: string | null;
  },
): void {
  /* intentionally empty */
}

/** No-op: guest directory is not persisted across reloads. */
export function persistGuestDirectory(_state: {
  conversations: StoredConversation[];
  activeConversationId: string | null;
}): void {
  /* intentionally empty */
}

export function clearPersistedGuestDirectory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* */
  }
}
