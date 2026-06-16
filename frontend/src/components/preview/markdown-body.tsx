"use client";

import ReactMarkdown from "react-markdown";

type Props = { markdown: string };

export function MarkdownBody({ markdown }: Props) {
  return (
    <article
      className={
        "space-y-3 break-words text-slate-800 dark:text-zinc-200 [&_a]:break-words [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg " +
        "[&_h2]:font-semibold [&_p]:leading-relaxed sm:[&_p]:text-justify [&_li]:ml-4 [&_li]:list-disc " +
        "[&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/5 [&_pre]:p-2 [&_pre]:text-sm dark:[&_pre]:bg-white/10"
      }
    >
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </article>
  );
}

