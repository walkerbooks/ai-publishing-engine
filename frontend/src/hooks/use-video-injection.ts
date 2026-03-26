"use client";

import { useEffect, useRef } from "react";
import { usePublishingStore } from "@/stores/publishing-store";
import {
  shouldInjectVideoBlock,
  buildVideoAssistantMessage,
} from "@/lib/chat/welcome-flow";
import { fetchVideos } from "@/lib/api/videos-client";

export function useVideoInjection() {
  const messages = usePublishingStore((s) => s.chatMessages);
  const pushAssistantMessage = usePublishingStore((s) => s.pushAssistantMessage);
  const sessionId = usePublishingStore((s) => s.sessionId);
  const lock = useRef(false);

  useEffect(() => {
    lock.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (!shouldInjectVideoBlock(messages) || lock.current) return;
    lock.current = true;
    fetchVideos("make money selling ebooks on Amazon KDP", 3)
      .then((v) => pushAssistantMessage(buildVideoAssistantMessage(v)))
      .catch(() => pushAssistantMessage(buildVideoAssistantMessage([])));
  }, [messages, pushAssistantMessage]);
}
