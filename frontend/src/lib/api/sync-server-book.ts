import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { createBook, patchBook } from "@/lib/api/books-client";
import { ensureGuestSession } from "@/lib/api/guest-session";
import { getAccessToken } from "@/lib/auth/access-token";
import { getLogger } from "@/lib/log";
import { usePublishingStore } from "@/stores/publishing-store";

const log = getLogger("sync-server-book");

/**
 * Persists the current book to the Go API after the in-chat preview is ready.
 * Creates a row on first success, or updates description + status on later runs.
 */
export async function syncBookToServerAfterPreview(previewMarkdown: string): Promise<void> {
  const { activeBookId, bookSpec, bookOutline } = usePublishingStore.getState();
  if (!activeBookId || !bookSpec) {
    log.debug("syncBookToServerAfterPreview: skip (no book id or spec)");
    return;
  }
  const token = getAccessToken();
  await ensureGuestSession();
  const rawTitle = String(bookSpec.title ?? "").trim();
  const title = (rawTitle.length >= 2 ? rawTitle : "Untitled book").slice(0, 180);
  const description = JSON.stringify({
    book_spec: bookSpec,
    book_outline: bookOutline ?? {},
    preview_content: previewMarkdown,
  });

  try {
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
      });
      log.debug("syncBookToServerAfterPreview: patched", { activeBookId });
      return;
    }
    if (head.status !== 404) {
      log.warning(`syncBookToServerAfterPreview: get book HTTP ${head.status}`);
      return;
    }
    await createBook(
      {
        title,
        description,
        public_id: activeBookId,
        status: "preview_ready",
      },
      token,
    );
    log.debug("syncBookToServerAfterPreview: created", { activeBookId });
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
  const rawTitle = String(bookSpec.title ?? "").trim();
  const title = (rawTitle.length >= 2 ? rawTitle : "Untitled book").slice(0, 180);
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
    if (head.ok) return true;
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
      },
      token,
    );
    log.debug("ensureServerBookForSession: created", { bookPublicId });
    return true;
  } catch (e) {
    log.warning("ensureServerBookForSession failed", e);
    return false;
  }
}
