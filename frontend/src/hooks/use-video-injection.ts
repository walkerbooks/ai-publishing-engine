"use client";

import { useEffect, useRef } from "react";
import { authGreetingName } from "@/lib/auth/greeting-name";
import { shouldAttachWelcomeVideos } from "@/lib/chat/welcome-flow";
import { fetchVideos } from "@/lib/api/videos-client";
import { useAuthStore } from "@/stores/auth-store";
import { usePublishingStore } from "@/stores/publishing-store";

/**
 * After onboarding name reply completes, fetch YouTube results and merge into that assistant bubble.
 */
export function useVideoInjection() {
  const messages = usePublishingStore((s) => s.chatMessages);
  const attachOnboardingVideosToMessage = usePublishingStore(
    (s) => s.attachOnboardingVideosToMessage,
  );
  const sessionId = usePublishingStore((s) => s.sessionId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const firstName = useAuthStore((s) => s.firstName);
  const email = useAuthStore((s) => s.email);
  const lock = useRef(false);

  const skipNameOnboarding =
    authGreetingName(isAuthenticated, firstName, email) != null;

  useEffect(() => {
    lock.current = false;
  }, [sessionId]);

  useEffect(() => {
    const opts = skipNameOnboarding ? { skipNameOnboarding: true } : undefined;
    if (!shouldAttachWelcomeVideos(messages, opts) || lock.current) return;
    const targetId = messages.at(-1)?.id;
    if (!targetId) return;
    lock.current = true;
    fetchVideos("make money selling ebooks on Amazon KDP", 3)
      .then((v) => attachOnboardingVideosToMessage(targetId, v))
      .catch(() => {
        attachOnboardingVideosToMessage(targetId, []);
      });
  }, [
    messages,
    attachOnboardingVideosToMessage,
    skipNameOnboarding,
  ]);
}
