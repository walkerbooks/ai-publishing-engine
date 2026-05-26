"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePublishingStore } from "@/stores/publishing-store";

export function IntakeCompletePanel() {
  const spec = usePublishingStore((s) => s.bookSpec);
  const bookId = usePublishingStore((s) => s.activeBookId);
  const reset = usePublishingStore((s) => s.resetFlow);
  const href = bookId ? `/book/${bookId}/outline` : "/chat";

  return (
    <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4">
      <p className="font-medium text-green-900">
        Book requirements captured. Continue to outline.
      </p>
      {spec ? (
        <details className="text-sm text-slate-700">
          <summary className="cursor-pointer">View specification</summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-white p-2 text-xs">
            {JSON.stringify(spec, null, 2)}
          </pre>
        </details>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={href}>Go to outline</Link>
        </Button>
        <Button variant="outline" onClick={() => reset()}>
          Start a new book
        </Button>
      </div>
    </div>
  );
}
