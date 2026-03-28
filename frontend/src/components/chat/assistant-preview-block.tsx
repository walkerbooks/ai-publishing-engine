"use client";

import { MarkdownBody } from "@/components/preview/markdown-body";

type Props = { markdown: string };

export function AssistantPreviewBlock({ markdown }: Props) {
  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white/90 p-3 dark:border-white/15 dark:bg-zinc-900/70">
      <div className="max-h-[60vh] overflow-y-auto rounded-md">
        <MarkdownBody markdown={markdown} />
      </div>
    </div>
  );
}
