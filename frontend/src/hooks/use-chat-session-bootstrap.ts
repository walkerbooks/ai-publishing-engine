"use client";

import { useEffect } from "react";

const LEGACY_DIRECTORY_KEY = "ai-pub-chat-directory";

/**
 * Drops legacy persisted chat directory from localStorage (older builds used Zustand persist).
 * Chat and conversation list are memory-only now.
 */
export function useChatSessionBootstrap() {
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_DIRECTORY_KEY);
    } catch {
      /* private mode / SSR */
    }
  }, []);
}
