"use client";

import ReactMarkdown from "react-markdown";

type Props = { markdown: string };

export function MarkdownBody({ markdown }: Props) {
  return (
    <article
      className={
        "space-y-3 text-slate-800 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg " +
        "[&_h2]:font-semibold [&_p]:leading-relaxed [&_li]:ml-4 [&_li]:list-disc"
      }
    >
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </article>
  );
}

