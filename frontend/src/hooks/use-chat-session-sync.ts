"use client";

import { useEffect } from "react";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { usePublishingStore } from "@/stores/publishing-store";

/**
 * Debounced sync from live publishing state into the in-memory conversation row.
 */
export function useChatSessionSync() {
  const activeConversationId = useChatDirectoryStore(
    (s) => s.activeConversationId,
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = usePublishingStore.subscribe((state) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        useChatDirectoryStore.getState().upsertActiveFromPublishing(state);
      }, 450);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [activeConversationId]);
}
