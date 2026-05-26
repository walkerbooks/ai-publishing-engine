"use client";

import type { BookOutlineLite } from "@/lib/types/chat";
import { OutlineChapters, type ChapterItem } from "@/components/outline/outline-chapters";
import { OutlineMetrics } from "@/components/outline/outline-metrics";
import { cn } from "@/lib/utils/cn";

type Props = {
  outline: BookOutlineLite;
  /** Inside chat bubble: no extra card — bubble supplies the panel. */
  chrome?: "card" | "embedded";
};

export function AssistantOutlineBlock({ outline, chrome = "card" }: Props) {
  const chapters = outline.chapters ?? [];
  const embedded = chrome === "embedded";
  return (
    <div
      className={cn(
        "w-full rounded-lg border border-border/80 bg-slate-100 p-3 dark:border-walker-navy/30 dark:bg-walker-nightPanel",
        embedded &&
          "rounded-none border-0 bg-transparent p-0 shadow-none dark:border-0 dark:bg-transparent",
      )}
    >
      <OutlineMetrics
        title={String(outline.book_title ?? "Book")}
        subtitle={outline.subtitle ? String(outline.subtitle) : undefined}
        totalWords={Number(outline.total_word_target ?? 0)}
        estPages={Number(outline.estimated_pages ?? 0)}
      />
      <div className="break-words">
        <OutlineChapters chapters={chapters as unknown as ChapterItem[]} />
      </div>
    </div>
  );
}
