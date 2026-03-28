"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { ChatMessage } from "@/lib/types/chat";

/**
 * Keeps the bottom of `containerRef` in view when `messages` change.
 * Prefer scrolling the pane directly — `scrollIntoView` often misses the intended overflow parent in nested flex layouts.
 */
export function useChatScroll(
  messages: ChatMessage[],
  containerRef: RefObject<HTMLElement | null>,
) {
  const prevLenRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const prev = prevLenRef.current;
    const nextLen = messages.length;
    prevLenRef.current = nextLen;

    const fromEmptyThread =
      prev !== null && prev === 0 && nextLen > 0;

    const run = () =>
      el.scrollTo({
        top: el.scrollHeight,
        behavior: fromEmptyThread ? "auto" : "smooth",
      });

    // After first message the thread mounts and the keyboard may resize the pane; wait for layout.
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [messages, containerRef]);
}
