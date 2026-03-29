import type { StoredConversation } from "@/stores/chat-directory-store";
import type { ChatSessionSnapshot } from "@/lib/chat/session-serialization";
import { getGuestMaxConversations } from "@/lib/guest/guest-config";

const STORAGE_KEY = "ai_pub_guest_directory_v1";

type PersistedV1 = {
  v: 1;
  activeConversationId: string | null;
  conversations: Array<{
    id: string;
    title: string;
    updatedAt: number;
    snapshot: ChatSessionSnapshot;
  }>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parsePayload(raw: string | null): PersistedV1 | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as unknown;
    if (!isRecord(j) || j.v !== 1) return null;
    const conversations = j.conversations;
    const activeConversationId =
      typeof j.activeConversationId === "string" || j.activeConversationId === null
        ? j.activeConversationId
        : null;
    if (!Array.isArray(conversations)) return null;
    const rows: PersistedV1["conversations"] = [];
    for (const c of conversations) {
      if (!isRecord(c)) continue;
      if (typeof c.id !== "string" || typeof c.title !== "string") continue;
      if (typeof c.updatedAt !== "number") continue;
      if (!isRecord(c.snapshot)) continue;
      rows.push({
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt,
        snapshot: c.snapshot as ChatSessionSnapshot,
      });
    }
    return { v: 1, activeConversationId, conversations: rows };
  } catch {
    return null;
  }
}

/** Restore guest sidebar + which thread was open. */
export function loadPersistedGuestDirectory(): {
  conversations: StoredConversation[];
  activeConversationId: string | null;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const p = parsePayload(localStorage.getItem(STORAGE_KEY));
    if (!p || p.conversations.length === 0) return null;
    const max = getGuestMaxConversations();
    let rows = p.conversations
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(
        (c): StoredConversation => ({
          id: c.id,
          title: c.title,
          updatedAt: c.updatedAt,
          snapshot: c.snapshot,
          serverBacked: false,
        }),
      );
    if (max > 0 && rows.length > max) {
      rows = rows.slice(0, max);
    }
    let active = p.activeConversationId;
    if (active && !rows.some((r) => r.id === active)) {
      active = rows[0]?.id ?? null;
    }
    if (!active && rows.length > 0) active = rows[0].id;
    return { conversations: rows, activeConversationId: active };
  } catch {
    return null;
  }
}

export function persistGuestDirectory(state: {
  conversations: StoredConversation[];
  activeConversationId: string | null;
}): void {
  if (typeof window === "undefined") return;
  const max = getGuestMaxConversations();
  const local = state.conversations
    .filter((c) => c.serverBacked !== true && c.snapshot != null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const capped = max > 0 ? local.slice(0, max) : local;
  try {
    if (capped.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    let active = state.activeConversationId;
    if (active && !capped.some((c) => c.id === active)) {
      active = capped[0]?.id ?? null;
    }
    const payload: PersistedV1 = {
      v: 1,
      activeConversationId: active,
      conversations: capped.map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt,
        snapshot: c.snapshot as ChatSessionSnapshot,
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearPersistedGuestDirectory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* */
  }
}
