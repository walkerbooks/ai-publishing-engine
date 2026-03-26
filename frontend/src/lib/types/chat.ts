export type VideoMeta = {
  title: string;
  link: string;
  thumbnail_url?: string;
};

export type ChatBlockKind = "intake" | "outline" | "preview" | "gate";

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

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  kind?: ChatBlockKind;
  content: string;
  videos?: VideoMeta[];
  outline?: BookOutlineLite;
  previewMarkdown?: string;
};

export type ChatApiResponse = {
  content: string;
  book_spec?: Record<string, unknown> | null;
  intake_complete?: boolean;
  book_id?: string | null;
};
