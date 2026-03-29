"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePublishingStore } from "@/stores/publishing-store";
import { BookSubnav } from "@/components/book/book-subnav";
import { MarkdownBody } from "@/components/preview/markdown-body";
import { ExportActions } from "@/components/book/export-actions";
import { Button } from "@/components/ui/button";
import {
  getBook,
  getGenerationJob,
  listChapters,
  patchBook,
  requestFullGeneration,
  type BackendChapter,
} from "@/lib/api/books-client";
import { getAccessToken } from "@/lib/auth/access-token";
import { usePayPalCheckout } from "@/hooks/use-paypal-checkout";
import { ensureServerBookForSession } from "@/lib/api/sync-server-book";

type Props = { bookId: string };

const PLACEHOLDER_FULL =
  "# Full manuscript\n\nFull book generation will appear here after payment " +
  "and backend jobs complete. This is placeholder content.\n\n" +
  "You can replace this with chapters loaded from your Go API.";

const PAID_LIKE = new Set(["paid", "generating", "complete"]);

function chaptersToMarkdown(chapters: BackendChapter[]): string {
  return [...chapters]
    .sort((a, b) => a.chapter_number - b.chapter_number)
    .map((c) => {
      const body = c.content.trim();
      if (body.startsWith("#")) return body;
      return `# ${c.title}\n\n${body}`;
    })
    .join("\n\n---\n\n");
}

export function FullBookPageClient({ bookId }: Props) {
  const router = useRouter();
  const spec = usePublishingStore((s) => s.bookSpec);
  const outline = usePublishingStore((s) => s.bookOutline);
  const preview = usePublishingStore((s) => s.previewContent);
  const mockPaid = usePublishingStore((s) => s.mockPaymentConfirmed);
  const full = usePublishingStore((s) => s.fullBookContent);
  const setPaid = usePublishingStore((s) => s.setMockPayment);
  const setFull = usePublishingStore((s) => s.setFullBookContent);
  const [backendPaid, setBackendPaid] = useState(false);
  const [backendCheckErr, setBackendCheckErr] = useState<string | null>(null);
  const [bookStatus, setBookStatus] = useState<string | null>(null);
  const [chaptersMd, setChaptersMd] = useState<string | null>(null);
  const [genHint, setGenHint] = useState<string | null>(null);
  const payloadSyncedRef = useRef(false);
  const {
    startCheckout,
    loading: payPalLoading,
    error: payPalErr,
    clearError: clearPayPalErr,
  } = usePayPalCheckout();

  useEffect(() => {
    if (!spec) router.replace("/chat");
    else if (!outline) router.replace(`/book/${bookId}/outline`);
    else if (!preview) router.replace(`/book/${bookId}/preview`);
  }, [spec, outline, preview, router, bookId]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const book = await getBook(bookId, token);
        if (cancelled) return;
        setBookStatus(book.Status);
        if (PAID_LIKE.has(book.Status)) {
          setBackendPaid(true);
          setPaid(true);
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "";
        if (/no rows|not found/i.test(msg)) {
          const recovered = await ensureServerBookForSession(bookId);
          if (!cancelled && recovered) {
            try {
              const book = await getBook(bookId, token);
              if (cancelled) return;
              setBookStatus(book.Status);
              if (PAID_LIKE.has(book.Status)) {
                setBackendPaid(true);
                setPaid(true);
              }
              setBackendCheckErr(null);
              return;
            } catch (e2) {
              setBackendCheckErr(e2 instanceof Error ? e2.message : "Could not load book status");
              return;
            }
          }
        }
        setBackendCheckErr(msg || "Could not load book status");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, setPaid]);

  const paid = backendPaid || mockPaid;

  /** Persist BSO + outline on the book row so the Python worker can load them by internal id. */
  useEffect(() => {
    const token = getAccessToken();
    if (!paid || !token || !spec || !outline || payloadSyncedRef.current) return;
    payloadSyncedRef.current = true;
    void patchBook(bookId, token, {
      description: JSON.stringify({
        book_spec: spec,
        book_outline: outline,
        ...(preview.trim() ? { preview_markdown: preview } : {}),
      }),
    }).catch(() => {
      payloadSyncedRef.current = false;
    });
  }, [paid, bookId, spec, outline, preview]);

  /** Poll chapters and generation job while the manuscript is being produced. */
  useEffect(() => {
    const token = getAccessToken();
    if (!paid || !token) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const [book, chapters, job] = await Promise.all([
          getBook(bookId, token),
          listChapters(bookId, token),
          getGenerationJob(bookId, token).catch(() => null),
        ]);
        if (cancelled) return;
        setBookStatus(book.Status);
        if (chapters.length) {
          const md = chaptersToMarkdown(chapters);
          setChaptersMd(md);
          setFull(md);
        }
        if (job) {
          if (job.status === "succeeded") {
            setGenHint("Generation job finished.");
          } else if (job.status === "queued" || job.status === "retry") {
            setGenHint(
              "Full book is queued. If this does not change, start the Go worker (cmd/worker) so jobs run.",
            );
          } else if (job.status === "in_progress") {
            setGenHint(`Writing manuscript (${job.kind})…`);
          } else {
            setGenHint(
              `Job: ${job.kind} — ${job.status}${job.last_error ? ` (${job.last_error})` : ""}`,
            );
          }
        } else {
          setGenHint(null);
        }
      } catch {
        /* ignore poll errors */
      }
    };
    void tick();
    const id = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [paid, bookId, setFull]);

  if (!spec || !outline || !preview) return null;

  const confirmMock = () => {
    setPaid(true);
    if (!full) setFull(PLACEHOLDER_FULL);
    const token = getAccessToken();
    if (token) {
      void requestFullGeneration(bookId, token).catch(() => {
        /* ignore — user may already have a job */
      });
    }
  };

  if (!paid) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <BookSubnav bookId={bookId} />
        <h1 className="text-2xl font-semibold">Full book</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pay with PayPal to unlock the full manuscript when your Go API marks the book as paid.
          The URL book ID must match your server book <span className="font-mono text-xs">{bookId}</span>.
        </p>
        {backendCheckErr ? (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">{backendCheckErr}</p>
        ) : null}
        {payPalErr ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {payPalErr}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            className="w-fit"
            disabled={payPalLoading}
            onClick={() => {
              clearPayPalErr();
              void startCheckout(bookId, `/book/${bookId}/full`);
            }}
          >
            {payPalLoading ? "Opening PayPal…" : "Pay with PayPal"}
          </Button>
          <Link href="/login" className="text-sm text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
        <Button type="button" className="mt-6 block" variant="outline" onClick={confirmMock}>
          Dev: skip payment (mock)
        </Button>
      </div>
    );
  }

  const displayMd =
    chaptersMd ||
    full ||
    (bookStatus === "generating" ? PLACEHOLDER_FULL : preview);

  const showingPreviewUntilChapters =
    Boolean(paid) &&
    !chaptersMd &&
    !full &&
    bookStatus !== "generating" &&
    bookStatus !== "complete";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BookSubnav bookId={bookId} />
      <h1 className="text-2xl font-semibold">Your book</h1>
      {bookStatus === "generating" ? (
        <p className="mt-2 text-sm text-slate-600">
          Generating full manuscript… This can take several minutes. This page refreshes content
          periodically.
        </p>
      ) : null}
      {showingPreviewUntilChapters ? (
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200/90">
          Showing your preview below until generated chapters are saved to the server.
        </p>
      ) : null}
      {genHint ? <p className="mt-1 text-xs text-slate-500">{genHint}</p> : null}
      <div className="mt-6 max-h-[75vh] overflow-y-auto rounded-lg border border-slate-200 p-4">
        <MarkdownBody markdown={displayMd} />
      </div>
      <ExportActions />
    </div>
  );
}
