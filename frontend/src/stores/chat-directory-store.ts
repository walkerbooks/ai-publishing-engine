"use client";

import { create } from "zustand";
import {
  createConversation,
  getConversationMessages,
  listConversations,
  patchConversationTitle,
  type ConversationDto,
} from "@/lib/api/conversation-client";
import { restorePublishingFromApiMessages } from "@/lib/chat/conversation-mappers";
import {
  applyPublishingSnapshot,
  deriveConversationTitle,
  publishingToSnapshot,
  type ChatSessionSnapshot,
} from "@/lib/chat/session-serialization";
import { getAccessToken } from "@/lib/auth/access-token";
import { getLogger } from "@/lib/log";
import { createInitialPublishingState, type PublishingState } from "@/stores/publishing-types";
import { useAuthStore } from "@/stores/auth-store";
import { usePublishingStore } from "@/stores/publishing-store";

const log = getLogger("chat-directory-store");

export type StoredConversation = {
  id: string;
  title: string;
  updatedAt: number;
  /** Local-only restore payload; null for server-backed rows until loaded. */
  snapshot: ChatSessionSnapshot | null;
  /** Created via POST /conversation when true. */
  serverBacked?: boolean;
};

type ChatDirectoryState = {
  conversations: StoredConversation[];
  activeConversationId: string | null;
  listLoaded: boolean;
};

type ChatDirectoryActions = {
  upsertActiveFromPublishing: (state: PublishingState) => void;
  selectConversation: (id: string) => Promise<void>;
  startNewConversation: () => Promise<void>;
  removeConversation: (id: string) => void;
  hydrateConversationListFromServer: () => Promise<void>;
  registerNewServerConversation: (c: ConversationDto) => void;
};

function sortConversations(list: StoredConversation[]): StoredConversation[] {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

function dtoToStored(c: ConversationDto): StoredConversation {
  return {
    id: c.public_id,
    title: c.title,
    updatedAt: Date.parse(c.updated_at) || Date.now(),
    snapshot: null,
    serverBacked: true,
  };
}

export const useChatDirectoryStore = create<ChatDirectoryState & ChatDirectoryActions>()(
  (set, get) => ({
    conversations: [],
    activeConversationId: null,
    listLoaded: false,

    registerNewServerConversation: (c: ConversationDto) => {
      const row = dtoToStored(c);
      set((s) => ({
        activeConversationId: c.public_id,
        conversations: sortConversations([
          row,
          ...s.conversations.filter((x) => x.id !== c.public_id),
        ]),
      }));
    },

    hydrateConversationListFromServer: async () => {
      const token = getAccessToken();
      if (!token || !useAuthStore.getState().isAuthenticated) {
        set({ listLoaded: true });
        return;
      }
      try {
        const list = await listConversations(token);
        const rows = list.map(dtoToStored);
        set({ conversations: sortConversations(rows), listLoaded: true });
        const { activeConversationId } = get();
        if (activeConversationId && rows.some((r) => r.id === activeConversationId)) {
          await get().selectConversation(activeConversationId);
        } else {
          set({ activeConversationId: null });
          usePublishingStore.setState(createInitialPublishingState());
        }
      } catch (e) {
        log.warning("hydrateConversationListFromServer failed", e);
        set({ listLoaded: true });
      }
    },

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
      const prevRow = conversations.find((c) => c.id === activeConversationId);
      const row: StoredConversation = {
        id: activeConversationId,
        title,
        updatedAt: now,
        snapshot: snap,
        serverBacked: prevRow?.serverBacked,
      };
      set({
        conversations: sortConversations([row, ...existing]),
      });

      const token = getAccessToken();
      if (
        useAuthStore.getState().isAuthenticated &&
        token &&
        prevRow?.serverBacked === true &&
        title &&
        title !== prevRow.title
      ) {
        void patchConversationTitle(token, activeConversationId, title)
          .then((c) => {
            set((s) => ({
              conversations: sortConversations(
                s.conversations.map((x) =>
                  x.id === c.public_id
                    ? {
                        ...x,
                        title: c.title,
                        updatedAt: Date.parse(c.updated_at) || Date.now(),
                      }
                    : x,
                ),
              ),
            }));
          })
          .catch((err) => log.warning("patchConversationTitle failed", err));
      }
    },

    selectConversation: async (id) => {
      if (id === get().activeConversationId) return;
      const { activeConversationId } = get();
      if (activeConversationId) {
        get().upsertActiveFromPublishing(usePublishingStore.getState());
      }
      const target = get().conversations.find((c) => c.id === id);
      if (!target) return;

      const token = getAccessToken();
      const authed = Boolean(useAuthStore.getState().isAuthenticated && token);

      if (authed && target.serverBacked === true && token) {
        try {
          const msgs = await getConversationMessages(token, id);
          const restored = restorePublishingFromApiMessages(id, msgs);
          usePublishingStore.setState(restored);
          set({ activeConversationId: id });
          return;
        } catch (e) {
          log.warning("selectConversation: load messages failed", e);
          return;
        }
      }

      if (!target.snapshot) return;
      applyPublishingSnapshot(usePublishingStore.setState, target.snapshot);
      set({ activeConversationId: id });
    },

    startNewConversation: async () => {
      const { activeConversationId } = get();
      if (activeConversationId) {
        get().upsertActiveFromPublishing(usePublishingStore.getState());
      }

      const token = getAccessToken();
      if (useAuthStore.getState().isAuthenticated && token) {
        try {
          const c = await createConversation(token, "New conversation");
          const initial = createInitialPublishingState();
          applyPublishingSnapshot(usePublishingStore.setState, initial);
          get().registerNewServerConversation(c);
          return;
        } catch (e) {
          log.warning("startNewConversation: server create failed, using local", e);
        }
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
            serverBacked: false,
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
        const row = after.conversations.find((c) => c.id === after.activeConversationId);
        if (row?.snapshot) {
          applyPublishingSnapshot(usePublishingStore.setState, row.snapshot);
          return;
        }
        if (row?.serverBacked === true && useAuthStore.getState().isAuthenticated) {
          void after.selectConversation(after.activeConversationId);
          return;
        }
      }
      usePublishingStore.setState(createInitialPublishingState());
    },
  }),
);
