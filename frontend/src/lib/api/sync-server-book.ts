import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { createBook, patchBook } from "@/lib/api/books-client";
import { ensureGuestSession } from "@/lib/api/guest-session";
import { getAccessToken } from "@/lib/auth/access-token";
import { getLogger } from "@/lib/log";
import { useAuthStore } from "@/stores/auth-store";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { usePublishingStore } from "@/stores/publishing-store";

/** Link book ↔ server conversation; omitted for guests / local-only threads (Go returns 400). */
export function getBookConversationLinkForApi(): {
  conversation_public_id?: string;
} {
  if (!getAccessToken() || !useAuthStore.getState().isAuthenticated) {
    return {};
  }
  const convId = useChatDirectoryStore.getState().activeConversationId;
  if (!convId?.trim()) return {};
  const row = useChatDirectoryStore
    .getState()
    .conversations.find((c) => c.id === convId);
  if (row?.serverBacked !== true) return {};
  return { conversation_public_id: convId.trim() };
}

const log = getLogger("sync-server-book");

/** Go book row title: BSO `title` is often empty; outline `book_title` is usually set. */
function resolveBookTitleForApi(
  bookSpec: Record<string, unknown>,
  bookOutline: Record<string, unknown> | null | undefined,
): string {
  const fromSpec = String(bookSpec.title ?? "").trim();
  if (fromSpec.length >= 2) return fromSpec.slice(0, 180);
  const ot = bookOutline?.book_title;
  const fromOutline = typeof ot === "string" ? ot.trim() : "";
  if (fromOutline.length >= 2) return fromOutline.slice(0, 180);
  return "Untitled book";
}

/**
 * Persists the current book to the Go API after the in-chat preview is ready.
 * Creates a row on first success, or updates description + status on later runs.
 */
export async function syncBookToServerAfterPreview(previewMarkdown: string): Promise<void> {
  const { activeBookId, bookSpec, bookOutline, bookPreviewRowSynced } =
    usePublishingStore.getState();
  if (!activeBookId || !bookSpec) {
    log.debug("syncBookToServerAfterPreview: skip (no book id or spec)");
    return;
  }
  const token = getAccessToken();
  await ensureGuestSession();
  const title = resolveBookTitleForApi(bookSpec, bookOutline);
  const description = JSON.stringify({
    book_spec: bookSpec,
    book_outline: bookOutline ?? {},
    preview_content: previewMarkdown,
  });

  const markSynced = () =>
    usePublishingStore.setState({ bookPreviewRowSynced: true });

  const convoLink = getBookConversationLinkForApi();

  try {
    if (bookPreviewRowSynced) {
      await patchBook(activeBookId, token, {
        description,
        title: title.slice(0, 180),
        status: "preview_ready",
        ...convoLink,
      });
      log.debug("syncBookToServerAfterPreview: patched", { activeBookId });
      return;
    }

    try {
      await createBook(
        {
          title,
          description,
          public_id: activeBookId,
          status: "preview_ready",
          ...convoLink,
        },
        token,
      );
      markSynced();
      log.debug("syncBookToServerAfterPreview: created", { activeBookId });
      return;
    } catch (createErr) {
      const headers: HeadersInit = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const head = await fetch(
        `${GO_API_PREFIX}/v1/books/${encodeURIComponent(activeBookId)}`,
        { method: "GET", headers, credentials: "include" },
      );
      if (head.ok) {
        await patchBook(activeBookId, token, {
          description,
          title: title.slice(0, 180),
          status: "preview_ready",
          ...convoLink,
        });
        markSynced();
        log.debug("syncBookToServerAfterPreview: patched after create conflict", {
          activeBookId,
        });
        return;
      }
      log.warning("syncBookToServerAfterPreview failed", createErr);
    }
  } catch (e) {
    log.warning("syncBookToServerAfterPreview failed", e);
  }
}

/**
 * When GET /v1/books/{id} returns 404 but the client still has this session's spec/outline/preview,
 * create the row (same as first-time preview sync). Call after login or if initial sync failed.
 * Returns false if URL id does not match store activeBookId or required state is missing.
 */
export async function ensureServerBookForSession(bookPublicId: string): Promise<boolean> {
  const { activeBookId, bookSpec, bookOutline, previewContent } = usePublishingStore.getState();
  const token = getAccessToken();
  if (!token || !bookSpec || activeBookId !== bookPublicId) {
    log.debug("ensureServerBookForSession: skip (token, spec, or id mismatch)");
    return false;
  }
  const title = resolveBookTitleForApi(bookSpec, bookOutline);
  const description = JSON.stringify({
    book_spec: bookSpec,
    book_outline: bookOutline ?? {},
    preview_content: previewContent || "",
  });

  try {
    const head = await fetch(
      `${GO_API_PREFIX}/v1/books/${encodeURIComponent(bookPublicId)}`,
      { method: "GET", headers: { ...goAuthHeaders(token), Accept: "application/json" }, credentials: "include" },
    );
    if (head.ok) {
      usePublishingStore.setState({ bookPreviewRowSynced: true });
      return true;
    }
    if (head.status !== 404) {
      log.warning(`ensureServerBookForSession: GET HTTP ${head.status}`);
      return false;
    }
    await createBook(
      {
        title,
        description,
        public_id: bookPublicId,
        status: "preview_ready",
        ...getBookConversationLinkForApi(),
      },
      token,
    );
    usePublishingStore.setState({ bookPreviewRowSynced: true });
    log.debug("ensureServerBookForSession: created", { bookPublicId });
    return true;
  } catch (e) {
    log.warning("ensureServerBookForSession failed", e);
    return false;
  }
}
