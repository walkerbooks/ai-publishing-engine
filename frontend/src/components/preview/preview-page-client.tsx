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
import { mapUserError } from "@/lib/errors/user-error-message";
import { getAccessToken } from "@/lib/auth/access-token";

type Props = { bookId: string };

export function PreviewPageClient({ bookId }: Props) {
  const router = useRouter();
  const spec = usePublishingStore((s) => s.bookSpec);
  const outline = usePublishingStore((s) => s.bookOutline);
  const preview = usePublishingStore((s) => s.previewContent);
  const stream = usePublishingStore((s) => s.streamedPreviewContent);
  const { mutate, isPending, isError, error, reset } = usePreviewMutation();

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

  const goCheckout = () => {
    if (!getAccessToken()) {
      router.push(
        `/login?next=${encodeURIComponent(`/paypal/checkout?book=${encodeURIComponent(bookId)}`)}`,
      );
      return;
    }
    router.push(`/paypal/checkout?book=${encodeURIComponent(bookId)}`);
  };

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
          layout="polite"
          message={previewError.message}
          tone={previewError.tone}
          retryable={previewError.retryable}
          onRetry={() => {
            reset();
            onGen();
          }}
          onDismiss={() => reset()}
          dismissLabel="Not now"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BookSubnav bookId={bookId} />
      <h1 className="text-2xl font-semibold">Preview</h1>
      <div className="mt-6 max-h-[70dvh] overflow-y-auto rounded-lg border border-slate-200 p-4">
        {showStream || preview ? (
          <MarkdownBody markdown={showStream ? stream : preview} />
        ) : (
          <Skeleton className="h-40 w-full" />
        )}
      </div>
      <BuyFullBookBar onCheckout={goCheckout} />
      <Link href="/chat" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
        Continue in chat for full book generation
      </Link>
    </div>
  );
}
