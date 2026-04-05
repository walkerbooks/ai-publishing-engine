export type VideoMeta = {
  title: string;
  link: string;
  thumbnail_url?: string;
};

export type ChatBlockKind =
  | "intake"
  | "outline"
  | "preview"
  | "gate"
  /** Full manuscript: progress, first chapter, then PDF when export is ready */
  | "full";

export type BookOutlineLite = {
  book_title?: string;
  subtitle?: string;
  total_word_target?: number;
  estimated_pages?: number;
  chapters: Array<{
    chapter_number: number;
    title: string;
    subtopics?: string[];
    word_target?: number;
  }>;
};

export type FullBookGenPhase =
  | "queued"
  | "generating"
  | "first_chapter"
  | "finishing"
  | "complete";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  kind?: ChatBlockKind;
  content: string;
  videos?: VideoMeta[];
  /** Client-only: welcome video fetch finished (success or empty) for this bubble. */
  welcomeVideosSettled?: boolean;
  outline?: BookOutlineLite;
  /** Persisted on intake row as book_spec_json — restores BSO when reopening a thread. */
  bookSpec?: Record<string, unknown> | null;
  previewMarkdown?: string;
  /** kind === "full" — in-chat manuscript + export */
  fullGenPhase?: FullBookGenPhase;
  fullGenStatusText?: string;
  fullChapterMarkdown?: string;
  fullPdfUrl?: string | null;
  fullBookTitle?: string | null;
  fullGenError?: string | null;
};

export type ChatApiResponse = {
  content: string;
  book_spec?: Record<string, unknown> | null;
  intake_complete?: boolean;
  book_id?: string | null;
};
