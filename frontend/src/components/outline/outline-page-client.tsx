"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePublishingStore } from "@/stores/publishing-store";
import { useOutlineMutation } from "@/hooks/use-outline-mutation";
import { BookSubnav } from "@/components/book/book-subnav";
import { OutlineMetrics } from "@/components/outline/outline-metrics";
import { OutlineChapters, type ChapterItem } from "@/components/outline/outline-chapters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Props = { bookId: string };

export function OutlinePageClient({ bookId }: Props) {
  const router = useRouter();
  const spec = usePublishingStore((s) => s.bookSpec);
  const outline = usePublishingStore((s) => s.bookOutline);
  const { mutate, isPending, isError, error, reset } = useOutlineMutation();

  useEffect(() => {
    if (!spec) router.replace("/chat");
  }, [spec, router]);

  if (!spec) return null;

  const onGenerate = () => spec && mutate(spec);

  if (!outline) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <BookSubnav bookId={bookId} />
        <h1 className="text-2xl font-semibold">Outline</h1>
        {isError ? (
          <p className="mt-2 text-sm text-red-600">
            {(error as Error).message}
            <Button variant="ghost" size="sm" className="ml-2" onClick={() => reset()}>
              Dismiss
            </Button>
          </p>
        ) : null}
        <Button className="mt-4" onClick={onGenerate} disabled={isPending}>
          {isPending ? "Generating…" : "Generate outline"}
        </Button>
        {isPending ? (
          <div className="mt-6 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-5/6" />
          </div>
        ) : null}
      </div>
    );
  }

  const o = outline as Record<string, unknown>;
  const chapters = (o.chapters as ChapterItem[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <BookSubnav bookId={bookId} />
      <OutlineMetrics
        title={String(o.book_title ?? "Book")}
        subtitle={o.subtitle ? String(o.subtitle) : undefined}
        totalWords={Number(o.total_word_target ?? 0)}
        estPages={Number(o.estimated_pages ?? 0)}
      />
      <OutlineChapters chapters={chapters} />
      <div className="mt-8">
        <Button asChild>
          <Link href={`/book/${bookId}/preview`}>Go to preview</Link>
        </Button>
      </div>
    </div>
  );
}
