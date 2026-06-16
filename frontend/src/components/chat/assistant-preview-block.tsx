"use client";

import { MarkdownBody } from "@/components/preview/markdown-body";
import { cn } from "@/lib/utils/cn";

type Props = {
  markdown: string;
  chrome?: "card" | "embedded";
};

export function AssistantPreviewBlock({ markdown, chrome = "card" }: Props) {
  const embedded = chrome === "embedded";
  return (
    <div
      className={cn(
        "w-full rounded-lg border border-slate-200 bg-white/90 p-3 dark:border-walker-navy/30 dark:bg-walker-nightPanel",
        embedded &&
          "rounded-none border-0 bg-transparent p-0 shadow-none dark:border-0 dark:bg-transparent",
      )}
    >
      <div className="max-h-[60dvh] overflow-y-auto rounded-md">
        <MarkdownBody markdown={markdown} />
      </div>
    </div>
  );
}
