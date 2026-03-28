"use client";

import { useTheme } from "next-themes";
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
  const { resolvedTheme } = useTheme();
  const safe = toOutlineLite(outline);
  if (!safe) return null;

  const isSidebar = variant === "sidebar";
  const isDark = resolvedTheme !== "light";
  const chapterAppearance = isDark ? "dark" : "light";

  return (
    <aside
      className={cn(
        "w-full min-w-0 rounded-2xl border p-4 backdrop-blur",
        isDark
          ? "border-white/15 bg-zinc-900/70"
          : "border-slate-200 bg-white shadow-sm",
        isSidebar
          ? "chat-outline-in flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          : "chat-outline-in h-fit",
        className,
      )}
      aria-live="polite"
    >
      <div className="shrink-0">
        <p
          className={cn(
            "mb-1 text-[11px] font-semibold uppercase tracking-widest",
            isDark ? "text-zinc-500" : "text-slate-500",
          )}
        >
          Generated Outline
        </p>
        <h3
          className={cn(
            "text-lg font-semibold",
            isDark ? "text-white" : "text-slate-900",
          )}
        >
          {safe.book_title}
        </h3>
        {safe.subtitle ? (
          <p
            className={cn(
              "mt-1 text-sm",
              isDark ? "text-zinc-400" : "text-slate-600",
            )}
          >
            {safe.subtitle}
          </p>
        ) : null}
        <div className="mt-3 flex gap-5 text-sm">
          <div>
            <p
              className={cn(
                "text-[11px] uppercase",
                isDark ? "text-zinc-500" : "text-slate-500",
              )}
            >
              Words
            </p>
            <p
              className={cn(
                "font-medium",
                isDark ? "text-zinc-100" : "text-slate-900",
              )}
            >
              {Number(safe.total_word_target ?? 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p
              className={cn(
                "text-[11px] uppercase",
                isDark ? "text-zinc-500" : "text-slate-500",
              )}
            >
              Pages
            </p>
            <p
              className={cn(
                "font-medium",
                isDark ? "text-zinc-100" : "text-slate-900",
              )}
            >
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
        <OutlineChapters appearance={chapterAppearance} chapters={safe.chapters} />
      </div>
    </aside>
  );
}
