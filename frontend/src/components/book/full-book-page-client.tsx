"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePublishingStore } from "@/stores/publishing-store";
import { BookSubnav } from "@/components/book/book-subnav";
import { MarkdownBody } from "@/components/preview/markdown-body";
import { ExportActions } from "@/components/book/export-actions";
import { Button } from "@/components/ui/button";
import { getBook } from "@/lib/api/books-client";
import { getAccessToken } from "@/lib/auth/access-token";
import { usePayPalCheckout } from "@/hooks/use-paypal-checkout";

type Props = { bookId: string };

const PLACEHOLDER_FULL =
  "# Full manuscript\n\nFull book generation will appear here after payment " +
  "and backend jobs complete. This is placeholder content.\n\n" +
  "You can replace this with chapters loaded from your Go API.";

const PAID_LIKE = new Set(["paid", "generating", "complete"]);

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
        if (PAID_LIKE.has(book.Status)) {
          setBackendPaid(true);
          setPaid(true);
        }
      } catch (e) {
        if (!cancelled) {
          setBackendCheckErr(e instanceof Error ? e.message : "Could not load book status");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId, setPaid]);

  if (!spec || !outline || !preview) return null;

  const paid = backendPaid || mockPaid;

  const confirmMock = () => {
    setPaid(true);
    if (!full) setFull(PLACEHOLDER_FULL);
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
        <Button className="mt-6 block" variant="outline" onClick={confirmMock}>
          Dev: skip payment (mock)
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BookSubnav bookId={bookId} />
      <h1 className="text-2xl font-semibold">Your book</h1>
      <div className="mt-6 max-h-[75vh] overflow-y-auto rounded-lg border border-slate-200 p-4">
        <MarkdownBody markdown={full || preview} />
      </div>
      <ExportActions />
    </div>
  );
}
