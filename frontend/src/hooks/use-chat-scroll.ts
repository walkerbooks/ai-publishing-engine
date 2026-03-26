"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types/chat";

export function useChatScroll(messages: ChatMessage[]) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  return endRef;
}
