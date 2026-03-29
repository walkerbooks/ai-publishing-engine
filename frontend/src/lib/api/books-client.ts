import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { getLogger } from "@/lib/log";

const log = getLogger("books-client");

/** Matches Go `models.Book` JSON (exported field names). */
export type BackendBook = {
  PublicID: string;
  Status: string;
  Title: string;
};

async function readErrorMessage(res: Response): Promise<string> {
  const t = await res.text();
  try {
    const j = JSON.parse(t) as { error?: string };
    if (j.error) return j.error;
  } catch {
    /* */
  }
  return t || `Request failed: ${res.status}`;
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
