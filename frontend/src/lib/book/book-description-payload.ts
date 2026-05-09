import { patchBook } from "@/lib/api/books-client";
import { getBookConversationLinkForApi } from "@/lib/api/sync-server-book";
import { usePublishingStore } from "@/stores/publishing-store";

/** JSON stored in Go `books.description` for generation + exports. */
export function buildBookDescriptionJson(): string {
  const s = usePublishingStore.getState();
  return JSON.stringify({
    book_spec: s.bookSpec ?? {},
    book_outline: s.bookOutline ?? {},
    preview_markdown: s.previewContent || "",
    front_matter: {
      include_acknowledgement: s.fullBookIncludeAcknowledgement,
      acknowledgement_text: s.fullBookAcknowledgementText,
      include_about_author: s.fullBookIncludeAboutAuthor,
      about_author_text: s.fullBookAboutAuthorText,
    },
  });
}

/** Persists spec, outline, preview, and full-book front matter before pay or generation. */
export async function persistBookDescriptionToGo(
  bookPublicId: string,
  accessToken: string | null,
): Promise<void> {
  await patchBook(bookPublicId, accessToken, {
    description: buildBookDescriptionJson(),
    ...getBookConversationLinkForApi(),
  });
}
