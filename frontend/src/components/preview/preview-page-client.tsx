"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePublishingStore } from "@/stores/publishing-store";
import { usePreviewMutation } from "@/hooks/use-preview-mutation";
import { BookSubnav } from "@/components/book/book-subnav";
import { MarkdownBody } from "@/components/preview/markdown-body";
import { BuyFullBookBar } from "@/components/preview/buy-full-book-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserErrorBanner } from "@/components/ui/user-error-banner";
import { usePayPalCheckout } from "@/hooks/use-paypal-checkout";
import { mapUserError } from "@/lib/errors/user-error-message";

type Props = { bookId: string };

export function PreviewPageClient({ bookId }: Props) {
  const router = useRouter();
  const spec = usePublishingStore((s) => s.bookSpec);
  const outline = usePublishingStore((s) => s.bookOutline);
  const preview = usePublishingStore((s) => s.previewContent);
  const stream = usePublishingStore((s) => s.streamedPreviewContent);
  const { mutate, isPending, isError, error, reset } = usePreviewMutation();
  const {
    startCheckout,
    retryCheckout,
    loading: checkoutLoading,
    error: checkoutErr,
    clearError: clearCheckoutErr,
  } = usePayPalCheckout();

  const previewError = useMemo(
    () => (isError && error ? mapUserError(error, "preview") : null),
    [isError, error],
  );

  useEffect(() => {
    if (!spec) router.replace("/chat");
    else if (!outline) router.replace(`/book/${bookId}/outline`);
  }, [spec, outline, router, bookId]);

  if (!spec || !outline) return null;

  const showStream = isPending && stream;

  const onGen = () =>
    mutate({ spec, outline, simulateStream: true });

  if (!preview && !isPending && !isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <BookSubnav bookId={bookId} />
        <h1 className="text-2xl font-semibold">Preview</h1>
        <Button className="mt-4" onClick={onGen}>
          Generate preview
        </Button>
      </div>
    );
  }

  if (isError && previewError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <BookSubnav bookId={bookId} />
        <h1 className="text-2xl font-semibold">Preview</h1>
        <UserErrorBanner
          layout="inline"
          message={previewError.message}
          tone={previewError.tone}
          retryable={previewError.retryable}
          onRetry={() => {
            reset();
            onGen();
          }}
          onDismiss={() => reset()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BookSubnav bookId={bookId} />
      <h1 className="text-2xl font-semibold">Preview</h1>
      <div className="mt-6 max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 p-4">
        {showStream || preview ? (
          <MarkdownBody markdown={showStream ? stream : preview} />
        ) : (
          <Skeleton className="h-40 w-full" />
        )}
      </div>
      <BuyFullBookBar
        loading={checkoutLoading}
        error={checkoutErr}
        onRetryCheckout={checkoutErr?.retryable ? () => retryCheckout() : undefined}
        onCheckout={() => {
          clearCheckoutErr();
          void startCheckout(bookId, `/book/${bookId}/preview`);
        }}
      />
      <Link href="/chat" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
        Continue in chat for full book generation
      </Link>
    </div>
  );
}
