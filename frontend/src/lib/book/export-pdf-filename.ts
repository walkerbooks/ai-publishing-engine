/** Safe single segment for Windows / macOS filenames. */
export function sanitizeFilenameSegment(raw: string, maxLen = 120): string {
  const s = raw
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
  return s.length > 0 ? s : "";
}

/**
 * Matches server-side export naming: "{Author} - {Title}.pdf"
 * (see Python `write_pdf_export_metadata` / download UX).
 */
export function buildExportPdfFilename(
  authorName: string | null | undefined,
  bookTitle: string | null | undefined,
): string {
  const author =
    sanitizeFilenameSegment(authorName ?? "") || "Author";
  const title =
    sanitizeFilenameSegment(bookTitle ?? "") || "Manuscript";
  return `${author} - ${title}.pdf`;
}
