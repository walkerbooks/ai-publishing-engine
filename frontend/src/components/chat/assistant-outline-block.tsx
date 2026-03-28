"use client";

import type { BookOutlineLite } from "@/lib/types/chat";
import { OutlineChapters, type ChapterItem } from "@/components/outline/outline-chapters";
import { OutlineMetrics } from "@/components/outline/outline-metrics";

type Props = { outline: BookOutlineLite };

export function AssistantOutlineBlock({ outline }: Props) {
  const chapters = outline.chapters ?? [];
  return (
    <div className="w-full rounded-lg border border-border/80 bg-slate-100/95 p-3 backdrop-blur-md dark:bg-background/80">
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
