/** Build an OpenAI Images prompt from BSO + outline (no LLM). */

/** Number of cover options the product generates for the user to choose from. */
export const COVER_VARIANT_COUNT = 3 as const;

function str(v: unknown, max = 4000): string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function chapterTitles(outline: Record<string, unknown> | null, max = 6): string {
  const ch = outline?.chapters;
  if (!Array.isArray(ch) || !ch.length) return "";
  const titles: string[] = [];
  for (const raw of ch.slice(0, max)) {
    if (raw && typeof raw === "object" && "title" in raw) {
      const t = str((raw as { title?: unknown }).title, 120);
      if (t) titles.push(t);
    }
  }
  return titles.length ? `Chapter themes: ${titles.join("; ")}.` : "";
}

/** Pen name / credited author from BSO or outline when present. */
function authorFromBookPayload(
  bookSpec: Record<string, unknown> | null,
  bookOutline: Record<string, unknown> | null,
): string {
  const keys = [
    "author_name",
    "authorName",
    "AuthorName",
    "author",
    "writer_name",
    "WriterName",
  ] as const;
  for (const src of [bookSpec, bookOutline]) {
    if (!src || typeof src !== "object") continue;
    for (const k of keys) {
      const v = str((src as Record<string, unknown>)[k], 200);
      if (v) return v;
    }
  }
  return "";
}

export function buildBookCoverPrompt(
  bookSpec: Record<string, unknown> | null,
  bookOutline: Record<string, unknown> | null,
  /** Intake / account name when not stored on spec (e.g. chat-collected name). */
  sessionAuthorFallback?: string | null,
  /** User's reply to "How do you want to sign your book?" — wins for the cover byline. */
  coverSigningNameFromUser?: string | null,
): string {
  const title =
    str(bookOutline?.book_title, 200) ||
    str(bookSpec?.title, 200) ||
    "Untitled book";
  const subtitle = str(bookOutline?.subtitle, 200);
  const genre = str(bookSpec?.genre, 120) || "general";
  const tone = str(bookSpec?.tone, 120) || "engaging";
  const audience = str(bookSpec?.audience, 200) || "general readers";
  const premise = str(bookSpec?.custom_instructions, 2500);
  const dedication = str(bookOutline?.dedication, 400);
  const chapters = chapterTitles(bookOutline);
  const author =
    str(coverSigningNameFromUser, 200) ||
    authorFromBookPayload(bookSpec, bookOutline) ||
    str(sessionAuthorFallback, 200);

  const subtitleLine = subtitle ? ` Subtitle: "${subtitle}".` : "";
  const titleBlock = subtitle
    ? `Primary title (hero typography, large and crisp): "${title}".${subtitleLine}`
    : `Primary title (hero typography, large and crisp): "${title}".`;
  const authorLine = author
    ? `Author byline at the bottom of the cover (legible typography, smaller than the title, centered or balanced with the layout): "${author}". Leave comfortable margin above the bottom edge.`
    : "";

  return [
    `Professional book cover illustration, portrait 2:3 aspect suitable for print and ebook.`,
    titleBlock,
    `Expressive artwork: let the main illustration boldly interpret the meaning, stakes, and emotional tone suggested by the title${subtitle ? " and subtitle" : ""}—use metaphor, symbolic objects, setting, color story, or a strong central figure so the image unmistakably belongs to this book, not a generic template.`,
    `Avoid unrelated stock scenery; composition should draw the eye toward the title and reinforce what the words promise.`,
    authorLine,
    `Genre: ${genre}. Tone: ${tone}. Intended readers: ${audience}.`,
    premise ? `Story / subject: ${premise}` : "",
    dedication ? `Dedication mood (subtle, not as text on cover unless minimal): ${dedication}` : "",
    chapters,
    `Cinematic lighting, cohesive palette, dramatic depth, strong focal point, high production value,`,
    `no cluttered collage, no watermark, no QR codes, no price stickers.`,
  ]
    .filter(Boolean)
    .join(" ");
}
