"use client";

import { create } from "zustand";
import type { PublishingState } from "@/stores/publishing-types";
import { usePublishingStore } from "@/stores/publishing-store";
import {
  applyPublishingSnapshot,
  deriveConversationTitle,
  publishingToSnapshot,
  type ChatSessionSnapshot,
} from "@/lib/chat/session-serialization";
import { createInitialPublishingState } from "@/stores/publishing-types";

export type StoredConversation = {
  id: string;
  title: string;
  updatedAt: number;
  snapshot: ChatSessionSnapshot;
};

type ChatDirectoryState = {
  conversations: StoredConversation[];
  activeConversationId: string | null;
};

type ChatDirectoryActions = {
  /** Update the active conversation row from live publishing state (memory only). */
  upsertActiveFromPublishing: (state: PublishingState) => void;
  selectConversation: (id: string) => void;
  startNewConversation: () => void;
  removeConversation: (id: string) => void;
};

function sortConversations(list: StoredConversation[]): StoredConversation[] {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** In-memory only — no localStorage; refresh clears sidebar + chat. */
export const useChatDirectoryStore = create<
  ChatDirectoryState & ChatDirectoryActions
>()((set, get) => ({
  conversations: [],
  activeConversationId: null,

  upsertActiveFromPublishing: (state) => {
    let activeConversationId = get().activeConversationId;
    const snap = publishingToSnapshot(state);
    const title = deriveConversationTitle(snap);
    const now = Date.now();

    if (!activeConversationId && state.chatMessages.length > 0) {
      activeConversationId = crypto.randomUUID();
      set({ activeConversationId });
    }
    if (!activeConversationId) return;

    const { conversations } = get();
    const existing = conversations.filter((c) => c.id !== activeConversationId);
    const row: StoredConversation = {
      id: activeConversationId,
      title,
      updatedAt: now,
      snapshot: snap,
    };
    set({
      conversations: sortConversations([row, ...existing]),
    });
  },

  selectConversation: (id) => {
    const { activeConversationId, conversations } = get();
    if (id === activeConversationId) return;
    if (activeConversationId) {
      get().upsertActiveFromPublishing(usePublishingStore.getState());
    }
    const target = conversations.find((c) => c.id === id);
    if (!target) return;
    applyPublishingSnapshot(usePublishingStore.setState, target.snapshot);
    set({ activeConversationId: id });
  },

  startNewConversation: () => {
    const { activeConversationId } = get();
    if (activeConversationId) {
      get().upsertActiveFromPublishing(usePublishingStore.getState());
    }
    const newId = crypto.randomUUID();
    const initial = createInitialPublishingState();
    applyPublishingSnapshot(usePublishingStore.setState, initial);
    set((s) => ({
      activeConversationId: newId,
      conversations: sortConversations([
        {
          id: newId,
          title: "New conversation",
          updatedAt: Date.now(),
          snapshot: publishingToSnapshot(usePublishingStore.getState()),
        },
        ...s.conversations,
      ]),
    }));
  },

  removeConversation: (id) => {
    const { activeConversationId, conversations } = get();
    const nextList = conversations.filter((c) => c.id !== id);
    let nextActive = activeConversationId;
    if (activeConversationId === id) {
      nextActive = nextList[0]?.id ?? null;
    }
    set({
      conversations: sortConversations(nextList),
      activeConversationId: nextActive,
    });
    const after = get();
    if (after.activeConversationId) {
      const row = after.conversations.find(
        (c) => c.id === after.activeConversationId,
      );
      if (row) {
        applyPublishingSnapshot(usePublishingStore.setState, row.snapshot);
        return;
      }
    }
    usePublishingStore.setState(createInitialPublishingState());
  },
}));
