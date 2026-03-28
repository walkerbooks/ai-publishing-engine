"use client";

import type { BookOutlineLite } from "@/lib/types/chat";
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
      return {
        chapter_number:
          typeof item.chapter_number === "number" ? item.chapter_number : i + 1,
        title: String(item.title ?? `Chapter ${i + 1}`),
        word_target:
          typeof item.word_target === "number" ? item.word_target : undefined,
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
          ? "chat-outline-in shrink-0"
          : "chat-outline-in h-fit",
        className,
      )}
      aria-live="polite"
    >
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

      <div
        className={cn(
          "mt-4 pr-1",
          isSidebar
            ? ""
            : "max-h-[50vh] overflow-y-auto sm:max-h-[55vh]",
        )}
      >
        <ul className="space-y-2">
          {safe.chapters.map((ch) => (
            <li
              key={ch.chapter_number}
              className="rounded-lg border border-white/10 bg-zinc-800/80 px-3 py-2"
            >
              <p className="text-sm font-medium text-zinc-100">
                Ch{ch.chapter_number}: {ch.title}
              </p>
              {ch.word_target ? (
                <p className="mt-0.5 text-xs text-zinc-400">
                  {ch.word_target.toLocaleString()} words
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
