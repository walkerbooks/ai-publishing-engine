"use client";

import { useEffect, useMemo, useState } from "react";
import { goAuthHeaders } from "@/lib/api/go-api";
import { getAccessToken } from "@/lib/auth/access-token";
import { buildExportPdfFilename } from "@/lib/book/export-pdf-filename";
import { mapUserError } from "@/lib/errors/user-error-message";
import { cn } from "@/lib/utils/cn";
import { UserErrorBanner } from "@/components/ui/user-error-banner";
import { useAuthStore } from "@/stores/auth-store";
import type { FullBookGenPhase } from "@/lib/types/chat";

type Props = {
  phase: FullBookGenPhase;
  statusLine: string;
  bookTitle?: string | null;
  /** Preferred for download filename; falls back to signed-in first name. */
  authorName?: string | null;
  pdfUrl?: string | null;
  error?: string | null;
  onRetryGeneration?: () => void;
  chrome?: "card" | "embedded";
};

export function AssistantFullBookBlock({
  phase,
  statusLine,
  bookTitle,
  authorName,
  pdfUrl,
  error,
  onRetryGeneration,
  chrome = "card",
}: Props) {
  const authFirstName = useAuthStore((s) => s.firstName);
  const embedded = chrome === "embedded";
  const doneWithPdf = phase === "complete" && Boolean(pdfUrl);
  const manuscriptDoneNoPdf = phase === "complete" && !pdfUrl && !error;
  const showStatusRow = !error && !doneWithPdf && !manuscriptDoneNoPdf;
  const showPulse = phase !== "complete";

  const generationError = useMemo(
    () => (error ? mapUserError(error, "export") : null),
    [error],
  );

  /** iframe src= does not send Bearer token; fetch with auth then use a blob URL so PDF renders. */
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfReloadKey, setPdfReloadKey] = useState(0);

  const mappedPdfLoadError = useMemo(
    () => (pdfLoadError ? mapUserError(pdfLoadError, "pdf") : null),
    [pdfLoadError],
  );

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
          setPdfLoadError(`Could not load PDF (${res.status}).`);
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
  }, [pdfUrl, pdfReloadKey]);

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
      {generationError ? (
        <UserErrorBanner
          layout="polite"
          message={generationError.message}
          tone={generationError.tone}
          retryable={generationError.retryable}
          onRetry={onRetryGeneration}
        />
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

      {phase === "complete" && pdfUrl ? (
        <div className="space-y-2 border-t border-border/60 pt-3 dark:border-white/10">
          <div className="space-y-1.5 text-sm leading-relaxed text-foreground">
            <p>
              Your PDF is ready{bookTitle ? (
                <>
                  {" "}
                  for{" "}
                  <span className="font-medium text-walker-teal">&ldquo;{bookTitle}&rdquo;</span>
                </>
              ) : null}
              . Preview it below, and we&rsquo;ve sent a copy to your email. For a new revision,
              start <span className="font-medium">New book chat</span> from the sidebar.
            </p>
          </div>
          {mappedPdfLoadError ? (
            <UserErrorBanner
              layout="polite"
              message={mappedPdfLoadError.message}
              retryable
              onRetry={() => {
                setPdfLoadError(null);
                setPdfReloadKey((k) => k + 1);
              }}
            />
          ) : null}
          <div className="overflow-hidden rounded-md border border-border/60 dark:border-white/10">
            {pdfLoading ? (
              <div className="flex h-[70dvh] items-center justify-center bg-muted/30 text-sm text-muted-foreground">
                Loading PDF…
              </div>
            ) : pdfBlobUrl ? (
              <iframe
                src={pdfBlobUrl}
                title={bookTitle ? `${bookTitle} PDF preview` : "PDF preview"}
                className="h-[70dvh] w-full bg-white"
              />
            ) : !mappedPdfLoadError ? (
              <div className="flex h-[40dvh] items-center justify-center bg-muted/20 text-sm text-muted-foreground">
                Preparing preview…
              </div>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Use <span className="font-medium">Download PDF</span> for the file name{" "}
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
