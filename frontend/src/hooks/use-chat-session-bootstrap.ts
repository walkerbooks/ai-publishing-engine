"use client";

import { useEffect } from "react";
import { ensureGuestSessionWithServer } from "@/lib/api/guest-client";
import { hydrateGuestStoresFromPersistence } from "@/lib/guest/guest-hydrate";

const LEGACY_DIRECTORY_KEY = "ai-pub-chat-directory";

/**
 * Drops legacy persisted chat directory from localStorage (older builds used Zustand persist).
 * Restores guest conversations from device storage when logged out.
 */
export function useChatSessionBootstrap() {
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_DIRECTORY_KEY);
    } catch {
      /* private mode / SSR */
    }
    void ensureGuestSessionWithServer().finally(() => {
      hydrateGuestStoresFromPersistence();
    });
  }, []);
}
