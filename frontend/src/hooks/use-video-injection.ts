"use client";

import { useEffect, useRef } from "react";
import { usePublishingStore } from "@/stores/publishing-store";
import { shouldAttachWelcomeVideos } from "@/lib/chat/welcome-flow";
import { fetchVideos } from "@/lib/api/videos-client";

/**
 * After onboarding name reply completes, fetch YouTube results and merge into that assistant bubble.
 */
export function useVideoInjection() {
  const messages = usePublishingStore((s) => s.chatMessages);
  const attachOnboardingVideosToMessage = usePublishingStore(
    (s) => s.attachOnboardingVideosToMessage,
  );
  const sessionId = usePublishingStore((s) => s.sessionId);
  const lock = useRef(false);

  useEffect(() => {
    lock.current = false;
  }, [sessionId]);

  useEffect(() => {
    if (!shouldAttachWelcomeVideos(messages) || lock.current) return;
    const targetId = messages[3]?.id;
    if (!targetId) return;
    lock.current = true;
    fetchVideos("make money selling ebooks on Amazon KDP", 3)
      .then((v) => attachOnboardingVideosToMessage(targetId, v))
      .catch(() => {
        /* leave name reply unchanged if fetch fails */
      });
  }, [messages, attachOnboardingVideosToMessage]);
}
