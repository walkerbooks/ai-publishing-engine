"use client";

import { useEffect, useState } from "react";
import { MarkdownBody } from "@/components/preview/markdown-body";
import { goAuthHeaders } from "@/lib/api/go-api";
import { getAccessToken } from "@/lib/auth/access-token";
import { buildExportPdfFilename } from "@/lib/book/export-pdf-filename";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import type { FullBookGenPhase } from "@/lib/types/chat";

type Props = {
  phase: FullBookGenPhase;
  statusLine: string;
  firstChapterMarkdown?: string;
  bookTitle?: string | null;
  /** Preferred for download filename; falls back to signed-in first name. */
  authorName?: string | null;
  pdfUrl?: string | null;
  error?: string | null;
  chrome?: "card" | "embedded";
};

export function AssistantFullBookBlock({
  phase,
  statusLine,
  firstChapterMarkdown,
  bookTitle,
  authorName,
  pdfUrl,
  error,
  chrome = "card",
}: Props) {
  const authFirstName = useAuthStore((s) => s.firstName);
  const embedded = chrome === "embedded";
  const doneWithPdf = phase === "complete" && Boolean(pdfUrl);
  const manuscriptDoneNoPdf = phase === "complete" && !pdfUrl && !error;
  const showStatusRow = !error && !doneWithPdf && !manuscriptDoneNoPdf;
  const showPulse = phase !== "complete";

  /** iframe src= does not send Bearer token; fetch with auth then use a blob URL so PDF renders. */
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!pdfUrl?.trim()) {
      setPdfBlobUrl(null);
      setPdfLoadError(null);
      setPdfLoading(false);
      return;
    }
    let cancelled = false;
    let urlToRevoke: string | null = null;
    setPdfLoadError(null);
    setPdfBlobUrl(null);
    setPdfLoading(true);

    void (async () => {
      try {
        const token = getAccessToken();
        const res = await fetch(pdfUrl, {
          credentials: "include",
          headers: goAuthHeaders(token ?? ""),
        });
        if (cancelled) return;
        if (!res.ok) {
          const t = await res.text();
          let msg = `Could not load PDF (${res.status}).`;
          try {
            const j = JSON.parse(t) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            if (t.trim()) msg = t.trim();
          }
          setPdfLoadError(msg);
          setPdfLoading(false);
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        const u = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        urlToRevoke = u;
        setPdfBlobUrl(u);
      } catch (e) {
        if (!cancelled) {
          setPdfLoadError(e instanceof Error ? e.message : "Failed to load PDF.");
        }
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [pdfUrl]);

  const authorForFilename =
    authorName?.trim() || authFirstName?.trim() || "Author";
  const pdfDownloadName = buildExportPdfFilename(authorForFilename, bookTitle);

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

      {phase === "complete" && pdfUrl ? (
        <div className="space-y-2 border-t border-border/60 pt-3 dark:border-white/10">
          <div className="space-y-1.5 text-sm leading-relaxed text-foreground">
            <p>
              Your PDF is ready{bookTitle ? (
                <>
                  {' '}
                  for{' '}
                  <span className="font-medium text-walker-teal">&ldquo;{bookTitle}&rdquo;</span>
                </>
              ) : null}
              . Preview it below, and we&rsquo;ve sent a copy to your email. If you&rsquo;d like
              changes, say so here.
            </p>
          </div>
          {pdfLoadError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {pdfLoadError}
            </p>
          ) : null}
          <div className="overflow-hidden rounded-md border border-border/60 dark:border-white/10">
            {pdfLoading ? (
              <div className="flex h-[70vh] items-center justify-center bg-muted/30 text-sm text-muted-foreground">
                Loading PDF…
              </div>
            ) : pdfBlobUrl ? (
              <iframe
                src={pdfBlobUrl}
                title={bookTitle ? `${bookTitle} PDF preview` : "PDF preview"}
                className="h-[70vh] w-full bg-white"
              />
            ) : !pdfLoadError ? (
              <div className="flex h-[40vh] items-center justify-center bg-muted/20 text-sm text-muted-foreground">
                Preparing preview…
              </div>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Use <span className="font-medium">Download PDF</span> for the file name{' '}
            <span className="whitespace-nowrap font-mono text-[11px]">{pdfDownloadName}</span>.
            Your browser&rsquo;s PDF toolbar may save with a generic name instead.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={pdfBlobUrl ?? "#"}
              download={pdfBlobUrl ? pdfDownloadName : undefined}
              className="inline-flex items-center justify-center rounded-xl bg-walker-teal px-4 py-2.5 text-sm font-semibold text-walker-charcoal shadow transition hover:brightness-110 disabled:pointer-events-none disabled:opacity-50"
              aria-disabled={!pdfBlobUrl}
              onClick={(e) => {
                if (!pdfBlobUrl) e.preventDefault();
              }}
            >
              Download PDF
            </a>
            <a
              href={pdfBlobUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-walker-teal/50 bg-transparent px-4 py-2.5 text-sm font-semibold text-walker-teal shadow-sm transition hover:bg-walker-teal/10 disabled:pointer-events-none disabled:opacity-50"
              aria-disabled={!pdfBlobUrl}
              onClick={(e) => {
                if (!pdfBlobUrl) e.preventDefault();
              }}
            >
              Open PDF in new tab
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
