"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePublishingStore } from "@/stores/publishing-store";
import { BookSubnav } from "@/components/book/book-subnav";
import { MarkdownBody } from "@/components/preview/markdown-body";
import { ExportActions } from "@/components/book/export-actions";
import { Button } from "@/components/ui/button";

type Props = { bookId: string };

const PLACEHOLDER_FULL =
  "# Full manuscript\n\nFull book generation will appear here after payment " +
  "and backend jobs complete. This is placeholder content.\n\n" +
  "You can replace this with chapters loaded from your Go API.";

export function FullBookPageClient({ bookId }: Props) {
  const router = useRouter();
  const spec = usePublishingStore((s) => s.bookSpec);
  const outline = usePublishingStore((s) => s.bookOutline);
  const preview = usePublishingStore((s) => s.previewContent);
  const paid = usePublishingStore((s) => s.mockPaymentConfirmed);
  const full = usePublishingStore((s) => s.fullBookContent);
  const setPaid = usePublishingStore((s) => s.setMockPayment);
  const setFull = usePublishingStore((s) => s.setFullBookContent);

  useEffect(() => {
    if (!spec) router.replace("/chat");
    else if (!outline) router.replace(`/book/${bookId}/outline`);
    else if (!preview) router.replace(`/book/${bookId}/preview`);
  }, [spec, outline, preview, router, bookId]);

  if (!spec || !outline || !preview) return null;

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
          Confirm mock payment to unlock this page. Stripe will replace this step.
        </p>
        <Button className="mt-4" onClick={confirmMock}>
          Confirm mock payment
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
