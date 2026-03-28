"use client";

import type { BookOutlineLite } from "@/lib/types/chat";
import { OutlineChapters } from "@/components/outline/outline-chapters";
import { cn } from "@/lib/utils/cn";

type Props = {
  outline: Record<string, unknown> | null;
  className?: string;
  /** embedded: mobile stack; sidebar: right column fills height with internal scroll */
  variant?: "embedded" | "sidebar";
};

function toOutlineLite(outline: Record<string, unknown> | null): BookOutlineLite | null {
  if (!outline) return null;
  const chaptersRaw = Array.isArray(outline.chapters) ? outline.chapters : [];
  const chapters = chaptersRaw
    .map((ch, i) => {
      const item = (ch ?? {}) as Record<string, unknown>;
      const subRaw = item.subtopics;
      const subtopics = Array.isArray(subRaw)
        ? subRaw
            .map((s) => (typeof s === "string" ? s : String(s ?? "")).trim())
            .filter(Boolean)
            .slice(0, 12)
        : undefined;

      return {
        chapter_number:
          typeof item.chapter_number === "number" ? item.chapter_number : i + 1,
        title: String(item.title ?? `Chapter ${i + 1}`),
        word_target:
          typeof item.word_target === "number" ? item.word_target : undefined,
        subtopics: subtopics?.length ? subtopics : undefined,
      };
    })
    .slice(0, 12);

  return {
    book_title: String(outline.book_title ?? "Generated outline"),
    subtitle:
      typeof outline.subtitle === "string" ? String(outline.subtitle) : undefined,
    total_word_target:
      typeof outline.total_word_target === "number"
        ? outline.total_word_target
        : 0,
    estimated_pages:
      typeof outline.estimated_pages === "number" ? outline.estimated_pages : 0,
    chapters,
  };
}

export function ChatOutlineSidecard({
  outline,
  className,
  variant = "embedded",
}: Props) {
  const safe = toOutlineLite(outline);
  if (!safe) return null;

  const isSidebar = variant === "sidebar";

  return (
    <aside
      className={cn(
        "w-full min-w-0 rounded-2xl border border-white/15 bg-zinc-900/70 p-4 backdrop-blur",
        isSidebar
          ? "chat-outline-in flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          : "chat-outline-in h-fit",
        className,
      )}
      aria-live="polite"
    >
      <div className="shrink-0">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Generated Outline
        </p>
        <h3 className="text-lg font-semibold text-white">{safe.book_title}</h3>
        {safe.subtitle ? (
          <p className="mt-1 text-sm text-zinc-400">{safe.subtitle}</p>
        ) : null}
        <div className="mt-3 flex gap-5 text-sm">
          <div>
            <p className="text-[11px] uppercase text-zinc-500">Words</p>
            <p className="font-medium text-zinc-100">
              {Number(safe.total_word_target ?? 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-zinc-500">Pages</p>
            <p className="font-medium text-zinc-100">
              {Number(safe.estimated_pages ?? 0)}
            </p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "chat-pane-scroll mt-4 min-h-0 pr-1",
          isSidebar
            ? "flex-1 overflow-y-auto overscroll-contain"
            : "max-h-[50vh] overflow-y-auto overscroll-contain sm:max-h-[55vh]",
        )}
      >
        <OutlineChapters appearance="dark" chapters={safe.chapters} />
      </div>
    </aside>
  );
}
