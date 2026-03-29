import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { throwIfGoResponseFailed } from "@/lib/api/go-response";
import { getLogger } from "@/lib/log";

const log = getLogger("books-client");

/** Matches Go `models.Book` JSON (exported field names). */
export type BackendBook = {
  PublicID: string;
  Status: string;
  Title: string;
};

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
    await throwIfGoResponseFailed(res);
  }
  return res.json() as Promise<BackendBook>;
}
