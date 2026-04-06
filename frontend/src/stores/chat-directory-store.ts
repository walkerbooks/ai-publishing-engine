"use client";

import { create } from "zustand";
import {
  getBook,
  listBooks,
  pickLinkedBookForConversation,
} from "@/lib/api/books-client";
import {
  createConversation,
  deleteConversation,
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
import { guestConversationLimitCopy, getGuestMaxConversations } from "@/lib/guest/guest-config";
import { scheduleGuestDirectoryPersist } from "@/lib/guest/guest-directory-persist";
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
  /** Shown when a guest hits NEXT_PUBLIC_GUEST_MAX_CONVERSATIONS. */
  guestGateMessage: string | null;
};

type ChatDirectoryActions = {
  registerNewServerConversation: (c: ConversationDto) => void;
  hydrateConversationListFromServer: () => Promise<void>;
  clearGuestGateMessage: () => void;
  upsertActiveFromPublishing: (state: PublishingState) => void;
  selectConversation: (id: string) => Promise<void>;
  startNewConversation: () => Promise<void>;
  removeConversation: (id: string) => Promise<void>;
  /** Wipe sidebar + active thread (e.g. on logout so the next user does not see prior chats). */
  clearAll: () => void;
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
    guestGateMessage: null,

    clearGuestGateMessage: () => set({ guestGateMessage: null }),

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

      // Ensure the open thread is registered before merging lists (avoids wiping the store when
      // activeConversationId was still null due to debounced session sync).
      get().upsertActiveFromPublishing(usePublishingStore.getState());

      const prevActive = get().activeConversationId;
      const prevConversations = get().conversations;
      const localRows = prevConversations.filter((c) => c.serverBacked !== true);

      try {
        const list = await listConversations(token);
        const serverRows = list.map(dtoToStored);
        const byId = new Map<string, StoredConversation>();
        for (const r of serverRows) {
          byId.set(r.id, r);
        }
        for (const r of localRows) {
          if (!byId.has(r.id)) {
            byId.set(r.id, r);
          }
        }
        const merged = sortConversations([...byId.values()]);
        set({ conversations: merged, listLoaded: true });

        if (prevActive && merged.some((r) => r.id === prevActive)) {
          const activeRow = merged.find((r) => r.id === prevActive)!;
          if (activeRow.serverBacked === true) {
            await get().selectConversation(prevActive);
          } else {
            set({ activeConversationId: prevActive });
          }
          return;
        }

        const pub = usePublishingStore.getState();
        const hasLocalSession =
          pub.chatMessages.length > 0 ||
          pub.bookSpec != null ||
          pub.intakeComplete;

        if (hasLocalSession) {
          get().upsertActiveFromPublishing(pub);
          const again = get().activeConversationId;
          if (again && merged.some((r) => r.id === again)) {
            const activeRow = merged.find((r) => r.id === again)!;
            if (activeRow.serverBacked === true) {
              await get().selectConversation(again);
            } else {
              set({ activeConversationId: again });
            }
            return;
          }
          const orphan = again
            ? prevConversations.find((c) => c.id === again) ??
              get().conversations.find((c) => c.id === again)
            : null;
          if (again && orphan && merged.every((r) => r.id !== again)) {
            const remerged = sortConversations([orphan, ...merged]);
            set({
              conversations: remerged,
              listLoaded: true,
              activeConversationId: again,
            });
            if (orphan.serverBacked === true) {
              await get().selectConversation(again);
            }
            return;
          }
        }

        set({ activeConversationId: null });
        usePublishingStore.setState(createInitialPublishingState());
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

      if (!activeConversationId) {
        if (useAuthStore.getState().isAuthenticated) {
          const needsId =
            state.chatMessages.length > 0 ||
            state.bookSpec != null ||
            state.intakeComplete;
          if (needsId) {
            activeConversationId = crypto.randomUUID();
            set({ activeConversationId });
          }
        } else if (state.chatMessages.length > 0) {
          const maxGuest = getGuestMaxConversations();
          if (maxGuest > 0) {
            const localCount = get().conversations.filter((c) => c.serverBacked !== true)
              .length;
            if (localCount >= maxGuest) {
              set({ guestGateMessage: guestConversationLimitCopy(maxGuest) });
              return;
            }
          }
          activeConversationId = crypto.randomUUID();
          set({ activeConversationId });
        }
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
      scheduleGuestDirectoryPersist(() => ({
        conversations: get().conversations,
        activeConversationId: get().activeConversationId,
      }));

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
          let next: PublishingState = restored;
          try {
            const books = await listBooks(token);
            const linked = pickLinkedBookForConversation(books, id);
            if (linked?.PublicID) {
              next = {
                ...restored,
                activeBookId: linked.PublicID,
                bookPreviewRowSynced: true,
              };
            }
            if (
              !next.bookSpec &&
              next.activeBookId &&
              token
            ) {
              try {
                const book = await getBook(next.activeBookId, token);
                const desc = book.Description?.trim();
                if (desc) {
                  const j = JSON.parse(desc) as {
                    book_spec?: Record<string, unknown>;
                  };
                  if (
                    j.book_spec &&
                    typeof j.book_spec === "object" &&
                    Object.keys(j.book_spec).length > 0
                  ) {
                    next = { ...next, bookSpec: j.book_spec };
                  }
                }
              } catch {
                /* best-effort — old rows may lack description */
              }
            }
          } catch (e) {
            log.warning("selectConversation: listBooks failed", e);
          }
          usePublishingStore.setState(next);
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
      if (!authed)
        scheduleGuestDirectoryPersist(() => ({
          conversations: get().conversations,
          activeConversationId: get().activeConversationId,
        }));
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

      const maxGuest = getGuestMaxConversations();
      if (maxGuest > 0) {
        const localCount = get().conversations.filter((c) => c.serverBacked !== true).length;
        if (localCount >= maxGuest) {
          set({ guestGateMessage: guestConversationLimitCopy(maxGuest) });
          return;
        }
      }

      const newId = crypto.randomUUID();
      const initial = createInitialPublishingState();
      applyPublishingSnapshot(usePublishingStore.setState, initial);
      set((s) => ({
        guestGateMessage: null,
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
      scheduleGuestDirectoryPersist(() => ({
        conversations: get().conversations,
        activeConversationId: get().activeConversationId,
      }));
    },

    removeConversation: async (id) => {
      const row = get().conversations.find((c) => c.id === id);
      const token = getAccessToken();
      const authed = Boolean(
        useAuthStore.getState().isAuthenticated && token,
      );
      if (row?.serverBacked === true && authed && token) {
        try {
          await deleteConversation(token, id);
        } catch (e) {
          log.warning("removeConversation: server delete failed", e);
          return;
        }
      }

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
        const nextRow = after.conversations.find((c) => c.id === after.activeConversationId);
        if (nextRow?.snapshot) {
          applyPublishingSnapshot(usePublishingStore.setState, nextRow.snapshot);
          return;
        }
        if (nextRow?.serverBacked === true && useAuthStore.getState().isAuthenticated) {
          void after.selectConversation(after.activeConversationId);
          return;
        }
      }
      usePublishingStore.setState(createInitialPublishingState());
      scheduleGuestDirectoryPersist(() => ({
        conversations: get().conversations,
        activeConversationId: get().activeConversationId,
      }));
    },

  clearAll: () => set({ conversations: [], activeConversationId: null }),
  }),
);
