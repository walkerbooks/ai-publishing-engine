"use client";

import { create } from "zustand";
import { VIDEO_BLOCK_HEADING } from "@/lib/constants/welcome";
import type { ChatMessage } from "@/lib/types/chat";
import {
  createInitialPublishingState,
  type PublishingActions,
  type PublishingState,
} from "@/stores/publishing-types";

export type { PublishingState } from "@/stores/publishing-types";

/** In-memory only — full refresh starts a new chat (no localStorage). */
export const usePublishingStore = create<PublishingState & PublishingActions>()(
  (set) => ({
    ...createInitialPublishingState(),
    pushUserMessage: (content) =>
      set((s) => ({
        chatMessages: [
          ...s.chatMessages,
          { id: crypto.randomUUID(), role: "user", content },
        ],
      })),
    pushAssistantMessage: (msg) =>
      set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
    attachOnboardingVideosToMessage: (messageId, videos) =>
      set((s) => ({
        chatMessages: s.chatMessages.map((m) => {
          if (m.id !== messageId) return m;
          if (m.videos?.length) return m;
          const list = videos.slice(0, 3);
          if (!list.length) return m;
          const base = m.content.trim();
          const marker = "Look at this TON of videos";
          const content = base.includes(marker)
            ? m.content
            : `${base}\n\n${VIDEO_BLOCK_HEADING}`;
          return { ...m, content, videos: list };
        }),
      })),
    popLastUserMessage: () =>
      set((s) => {
        const m = s.chatMessages;
        if (!m.length || m[m.length - 1].role !== "user") return s;
        return { chatMessages: m.slice(0, -1) };
      }),
    appendAssistantDelta: (messageId, delta) =>
      set((s) => ({
        chatMessages: s.chatMessages.map((m) => {
          if (m.id !== messageId) return m;
          const placeholder = m.content.trim().startsWith("[");
          return {
            ...m,
            content: placeholder ? delta : `${m.content}${delta}`,
          };
        }),
      })),
    setAssistantOutline: (messageId, outline) =>
      set((s) => ({
        chatMessages: s.chatMessages.map((m) =>
          m.id === messageId
            ? { ...m, kind: "outline", content: "Outline generated.", outline }
            : m,
        ),
      })),
    setAssistantPreview: (messageId, previewMarkdown) =>
      set((s) => ({
        chatMessages: s.chatMessages.map((m) =>
          m.id === messageId
            ? {
                ...m,
                kind: "preview",
                content: "Preview ready.",
                previewMarkdown,
              }
            : m,
        ),
      })),
    setPendingPrompt: (pendingPrompt) => set({ pendingPrompt }),
    setAwaitingGate: (awaitingGate) => set({ awaitingGate }),
    setComposerStep: (composerStep) => set({ composerStep }),
    setComposerAction: (composerAction) => set({ composerAction }),
    resetFlow: () =>
      set({
        ...createInitialPublishingState(),
        sessionId: crypto.randomUUID(),
      }),
    setIntakeResult: (intakeComplete, bookSpec, bookId) =>
      set((s) => {
        const nextActive = bookId ?? s.activeBookId ?? crypto.randomUUID();
        const sameBook = nextActive === s.activeBookId;
        return {
          intakeComplete,
          bookSpec,
          activeBookId: nextActive,
          bookPreviewRowSynced: sameBook ? s.bookPreviewRowSynced : false,
        };
      }),
    setActiveBookId: (activeBookId) =>
      set((s) => ({
        activeBookId,
        bookPreviewRowSynced:
          activeBookId === s.activeBookId ? s.bookPreviewRowSynced : false,
      })),
    setBookOutline: (bookOutline) => set({ bookOutline }),
    setPreviewContent: (previewContent) => set({ previewContent }),
    appendStreamPreview: (chunk) =>
      set((s) => ({
        streamedPreviewContent: s.streamedPreviewContent + chunk,
      })),
    clearStreamPreview: () => set({ streamedPreviewContent: "" }),
    setFullBookContent: (fullBookContent) => set({ fullBookContent }),
    setMockPayment: (mockPaymentConfirmed) => set({ mockPaymentConfirmed }),
    setUserName: (userName) => set({ userName }),
    setGuestEmail: (guestEmail) => set({ guestEmail }),
    patchChatMessage: (messageId, patch) =>
      set((s) => ({
        chatMessages: s.chatMessages.map((m) =>
          m.id === messageId ? ({ ...m, ...patch } as ChatMessage) : m,
        ),
      })),
  }),
);
