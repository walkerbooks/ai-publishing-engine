/** After intake brief is ready: ask whether to edit title/subtitle before outline. */
export type TitleConfirmStage =
  | "pending"
  | "ask"
  | "title"
  | "subtitle"
  | "done";

export function specTitleKey(
  spec: Record<string, unknown> | null | undefined,
): string | null {
  if (!spec || typeof spec !== "object") return null;
  const title = String(spec.title ?? "").trim();
  if (!title) return null;
  const subtitle = String(spec.subtitle ?? "").trim();
  return `${title}::${subtitle}`;
}

/** Gate copy: state the working title/subtitle, then ask whether to edit. */
export function formatTitleConfirmAskCopy(
  spec: Record<string, unknown> | null | undefined,
): string {
  const title = String(spec?.title ?? "").trim();
  const subtitle = String(spec?.subtitle ?? "").trim();
  const titleLine = title
    ? `Title: ${title}`
    : "Title: (none yet — we can set one now)";
  const subtitleLine = subtitle
    ? `Subtitle: ${subtitle}`
    : "Subtitle: (none yet — optional)";
  return (
    `Your book brief is complete. Here's the working title I'm using:\n\n` +
    `${titleLine}\n` +
    `${subtitleLine}\n\n` +
    `Would you like to check or edit the title and subtitle before we build the outline?`
  );
}
