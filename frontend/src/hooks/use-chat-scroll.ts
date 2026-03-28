"use client";

import { useEffect, type RefObject } from "react";
import type { ChatMessage } from "@/lib/types/chat";

/**
 * Keeps the bottom of `containerRef` in view when `messages` change.
 * Prefer scrolling the pane directly — `scrollIntoView` often misses the intended overflow parent in nested flex layouts.
 */
export function useChatScroll(
  messages: ChatMessage[],
  containerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, containerRef]);
}
