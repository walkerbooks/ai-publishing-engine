"use client";

import { useEffect } from "react";
import { ensureGuestSessionWithServer } from "@/lib/api/guest-client";
import { clearPersistedGuestDirectory } from "@/lib/guest/guest-directory-persist";
import { hydrateGuestStoresFromPersistence } from "@/lib/guest/guest-hydrate";

const LEGACY_DIRECTORY_KEY = "ai-pub-chat-directory";

/**
 * Removes legacy guest chat snapshots from localStorage. Guest threads are session-only
 * (in-memory); Go guest cookie still registers via ensureGuestSessionWithServer.
 */
export function useChatSessionBootstrap() {
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_DIRECTORY_KEY);
    } catch {
      /* private mode / SSR */
    }
    clearPersistedGuestDirectory();
    void ensureGuestSessionWithServer().finally(() => {
      hydrateGuestStoresFromPersistence();
    });
  }, []);
}
