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

export function buildBookCoverPrompt(
  bookSpec: Record<string, unknown> | null,
  bookOutline: Record<string, unknown> | null,
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

  const subtitleLine = subtitle ? ` Subtitle: "${subtitle}".` : "";

  return [
    `Professional book cover illustration, portrait 2:3 aspect suitable for print and ebook.`,
    `Title on cover (legible typography): "${title}".${subtitleLine}`,
    `Genre: ${genre}. Tone: ${tone}. Intended readers: ${audience}.`,
    premise ? `Story / subject: ${premise}` : "",
    dedication ? `Dedication mood (subtle, not as text on cover unless minimal): ${dedication}` : "",
    chapters,
    `Cinematic lighting, cohesive palette, strong focal point, high production value,`,
    `no cluttered collage, no watermark, no QR codes, no price stickers.`,
  ]
    .filter(Boolean)
    .join(" ");
}
