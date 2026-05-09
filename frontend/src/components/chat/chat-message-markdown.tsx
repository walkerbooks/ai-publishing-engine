"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";

type Props = {
  /** Raw message text; supports **bold**, *italic*, lists, paragraphs, etc. */
  children: string;
  className?: string;
};

const components: Components = {
  p: ({ children }) => (
    <p className="mb-2 whitespace-pre-wrap break-words last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-inherit">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="whitespace-pre-wrap break-words">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium underline underline-offset-2 hover:opacity-90"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="my-2 max-w-full overflow-x-auto rounded-md bg-black/10 p-2 text-[0.9em] dark:bg-white/10">
      {children}
    </pre>
  ),
  code: ({ children, className }) => {
    if (className) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-black/10 px-1 py-0.5 text-[0.9em] dark:bg-white/15">
        {children}
      </code>
    );
  },
};

/**
 * Renders assistant/user chat copy with markdown (e.g. **bold**) instead of raw asterisks.
 */
export function ChatMessageMarkdown({ children, className }: Props) {
  const text = children ?? "";
  if (!text.trim()) {
    return null;
  }
  return (
    <div
      className={
        "break-words text-inherit [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-current/30 [&_blockquote]:pl-3 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-medium" +
        (className ? ` ${className}` : "")
      }
    >
      <ReactMarkdown components={components}>{text}</ReactMarkdown>
    </div>
  );
}
