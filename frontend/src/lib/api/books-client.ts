import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { throwIfGoResponseFailed } from "@/lib/api/go-response";
import { getLogger } from "@/lib/log";

const log = getLogger("books-client");

/** Matches Go `models.Book` JSON (exported field names). */
export type BackendBook = {
  PublicID: string;
  Status: string;
  Title: string;
  /** Optional thread that produced this book (snake_case JSON tag on Go side). */
  conversation_public_id?: string | null;
  /** RFC3339 from Go `time.Time` when listing books (newest first client-side when set). */
  UpdatedAt?: string;
};

/**
 * Books linked to the same conversation (should be rare); prefer the most recently updated row.
 */
export function pickLinkedBookForConversation(
  books: BackendBook[],
  conversationPublicId: string,
): BackendBook | null {
  const needle = conversationPublicId.trim().toLowerCase();
  if (!needle) return null;
  const matches = books.filter(
    (b) => (b.conversation_public_id?.trim().toLowerCase() ?? "") === needle,
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const ta = a.UpdatedAt ? Date.parse(a.UpdatedAt) : 0;
    const tb = b.UpdatedAt ? Date.parse(b.UpdatedAt) : 0;
    return tb - ta;
  });
  return matches[0] ?? null;
}

export type BackendChapter = {
  chapter_number: number;
  title: string;
  content: string;
};

/** Go `models.GenerationJob` JSON (exported field names). */
export type BackendGenerationJob = {
  public_id: string;
  kind: string;
  status: string;
  attempts: number;
  last_error: string;
};

async function readErrorMessage(res: Response): Promise<string> {
  const t = await res.text();
  const plain = t.trim();
  const lower = plain.toLowerCase();
  if (res.status === 401 && lower.includes("token expired")) {
    return "Session expired — sign in again. JWT access tokens have a fixed expiry set at login; changing server TTL only affects new logins.";
  }
  try {
    const j = JSON.parse(t) as { error?: string };
    if (j.error) return j.error;
  } catch {
    /* */
  }
  return plain || `Request failed: ${res.status}`;
}

export async function listBooks(accessToken: string | null): Promise<BackendBook[]> {
  const headers: HeadersInit = { Accept: "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${GO_API_PREFIX}/v1/books`, {
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    log.warning(`listBooks: HTTP ${res.status}`);
    throw new Error(await readErrorMessage(res));
  }
  const data = (await res.json()) as { books?: BackendBook[] };
  return data.books ?? [];
}

export async function getBook(
  bookPublicId: string,
  accessToken: string | null,
): Promise<BackendBook> {
  const headers: HeadersInit = accessToken
    ? goAuthHeaders(accessToken)
    : { Accept: "application/json" };
  const res = await fetch(`${GO_API_PREFIX}/v1/books/${encodeURIComponent(bookPublicId)}`, {
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    log.debug(`getBook: HTTP ${res.status}`, { bookPublicId });
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<BackendBook>;
}

export type CreateBookBody = {
  title: string;
  description: string;
  public_id?: string;
  status?: "draft" | "spec_complete" | "outline_ready" | "preview_ready";
  conversation_public_id?: string;
};

/**
 * Moves books created under the guest session to the logged-in user.
 * Requires JWT + guest cookie; Go returns 200 with claimed:false when there is nothing to merge.
 */
export async function claimGuestBooks(accessToken: string): Promise<void> {
  const res = await fetch(`${GO_API_PREFIX}/v1/books/claim`, {
    method: "POST",
    headers: goAuthHeaders(accessToken),
    credentials: "include",
  });
  if (res.ok) {
    log.debug("claimGuestBooks: ok");
    return;
  }
  if (res.status === 400) {
    return;
  }
  log.warning(`claimGuestBooks: HTTP ${res.status}`);
}

export async function createBook(
  body: CreateBookBody,
  accessToken: string | null,
): Promise<BackendBook> {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${GO_API_PREFIX}/v1/books`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    log.debug(`createBook: HTTP ${res.status}`);
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<BackendBook>;
}

export async function patchBook(
  bookPublicId: string,
  accessToken: string | null,
  body: {
    title?: string;
    description?: string;
    status?: "draft" | "spec_complete" | "outline_ready" | "preview_ready" | "awaiting_payment";
    conversation_public_id?: string;
  },
): Promise<void> {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${GO_API_PREFIX}/v1/books/${encodeURIComponent(bookPublicId)}`, {
    method: "PATCH",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    log.debug(`patchBook: HTTP ${res.status}`, { bookPublicId });
    throw new Error(await readErrorMessage(res));
  }
}

export async function listChapters(
  bookPublicId: string,
  accessToken: string | null,
): Promise<BackendChapter[]> {
  const headers: HeadersInit = { Accept: "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(
    `${GO_API_PREFIX}/v1/chapters/${encodeURIComponent(bookPublicId)}`,
    { headers, credentials: "include" },
  );
  if (!res.ok) {
    log.debug(`listChapters: HTTP ${res.status}`, { bookPublicId });
    throw new Error(await readErrorMessage(res));
  }
  const data = (await res.json()) as { chapters?: BackendChapter[] };
  return data.chapters ?? [];
}

/**
 * Queue full book generation. Go accepts exactly `{ "book_public_id": "<uuid>" }` (snake_case
 * only; extra keys → 400). Call only when book status is preview_ready or awaiting_payment, or
 * expect 400 if the book is already paid/generating without an idempotent job reuse.
 */
export async function requestFullGeneration(
  bookPublicId: string,
  accessToken: string | null,
): Promise<void> {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${GO_API_PREFIX}/v1/full-book/request`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ book_public_id: bookPublicId }),
  });
  if (!res.ok) {
    log.debug(`requestFullGeneration: HTTP ${res.status}`, { bookPublicId });
    throw new Error(await readErrorMessage(res));
  }
}

export async function getGenerationJob(
  bookPublicId: string,
  accessToken: string | null,
): Promise<BackendGenerationJob> {
  const headers: HeadersInit = { Accept: "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(
    `${GO_API_PREFIX}/v1/generation/${encodeURIComponent(bookPublicId)}/status`,
    { headers, credentials: "include" },
  );
  if (!res.ok) {
    log.debug(`getGenerationJob: HTTP ${res.status}`, { bookPublicId });
    throw new Error(await readErrorMessage(res));
  }
  return res.json() as Promise<BackendGenerationJob>;
}
