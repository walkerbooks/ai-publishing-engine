"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchPreview } from "@/lib/api/preview-client";
import { usePublishingStore } from "@/stores/publishing-store";
import { chunkTextByParagraphs } from "@/lib/stream/chunk-text";

export function usePreviewMutation() {
  const setPreview = usePublishingStore((s) => s.setPreviewContent);
  const clearStream = usePublishingStore((s) => s.clearStreamPreview);
  const append = usePublishingStore((s) => s.appendStreamPreview);

  return useMutation({
    mutationFn: async ({
      spec,
      outline,
      simulateStream,
    }: {
      spec: Record<string, unknown>;
      outline: Record<string, unknown>;
      simulateStream: boolean;
    }) => {
      clearStream();
      const res = await fetchPreview(spec, outline);
      const raw = res.preview_content ?? "";
      if (!simulateStream) {
        setPreview(raw);
        return raw;
      }
      let acc = "";
      for await (const part of chunkTextByParagraphs(raw)) {
        acc += part;
        append(part);
      }
      setPreview(acc);
      return acc;
    },
  });
}
