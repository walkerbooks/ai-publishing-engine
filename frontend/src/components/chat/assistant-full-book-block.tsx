"use client";

import { MarkdownBody } from "@/components/preview/markdown-body";
import { cn } from "@/lib/utils/cn";
import type { FullBookGenPhase } from "@/lib/types/chat";

type Props = {
  phase: FullBookGenPhase;
  statusLine: string;
  firstChapterMarkdown?: string;
  bookTitle?: string | null;
  pdfUrl?: string | null;
  error?: string | null;
  chrome?: "card" | "embedded";
};

export function AssistantFullBookBlock({
  phase,
  statusLine,
  firstChapterMarkdown,
  bookTitle,
  pdfUrl,
  error,
  chrome = "card",
}: Props) {
  const embedded = chrome === "embedded";
  const doneWithPdf = phase === "complete" && Boolean(pdfUrl);
  const docxUrl =
    pdfUrl && /\/exports\/pdf\//i.test(pdfUrl)
      ? pdfUrl.replace(/\/exports\/pdf\//i, "/exports/docx/")
      : undefined;
  const manuscriptDoneNoPdf = phase === "complete" && !pdfUrl && !error;
  const showStatusRow = !error && !doneWithPdf && !manuscriptDoneNoPdf;
  const showPulse = phase !== "complete";

  return (
    <div
      className={cn(
        "w-full space-y-3 rounded-lg border border-slate-200 bg-white/90 p-3 dark:border-walker-navy/30 dark:bg-walker-nightPanel",
        embedded &&
          "rounded-none border-0 bg-transparent p-0 shadow-none dark:border-0 dark:bg-transparent",
      )}
    >
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {phase === "complete" && pdfUrl ? (
        <div className="space-y-2">
          <p className="font-medium text-foreground">
            {bookTitle ? (
              <>
                <span className="text-muted-foreground">Your book </span>
                <span className="text-walker-teal">&ldquo;{bookTitle}&rdquo;</span>
                <span className="text-muted-foreground"> is ready.</span>
              </>
            ) : (
              "Your book is ready."
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            Download the PDF or Word document, read it through, and tell us if you want any
            changes.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={pdfUrl}
              download
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-walker-teal px-4 py-2.5 text-sm font-semibold text-walker-charcoal shadow transition hover:brightness-110"
            >
              Download PDF
            </a>
            {docxUrl ? (
              <a
                href={docxUrl}
                download
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-walker-teal/50 bg-transparent px-4 py-2.5 text-sm font-semibold text-walker-teal shadow-sm transition hover:bg-walker-teal/10"
              >
                Download Word
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === "complete" && !pdfUrl && !error ? (
        <p className="text-sm text-muted-foreground">
          Manuscript is complete. PDF export is not available yet — your chapters are saved on the
          server.
        </p>
      ) : null}

      {showStatusRow ? (
        <div className="flex items-start gap-2">
          {showPulse ? (
            <span
              className="mt-1 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-walker-teal"
              aria-hidden
            />
          ) : null}
          <p className="text-sm italic text-muted-foreground">{statusLine}</p>
        </div>
      ) : null}

      {firstChapterMarkdown?.trim() ? (
        <div className="space-y-2 border-t border-border/60 pt-3 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            First chapter
          </p>
          <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border/50 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-walker-night/80">
            <MarkdownBody markdown={firstChapterMarkdown} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
