"use client";

import { useMutation } from "@tanstack/react-query";
import { fetchOutline } from "@/lib/api/outline-client";
import { usePublishingStore } from "@/stores/publishing-store";

export function useOutlineMutation() {
  const setBookOutline = usePublishingStore((s) => s.setBookOutline);
  return useMutation({
    mutationFn: (spec: Record<string, unknown>) => fetchOutline(spec),
    onSuccess: (data) => setBookOutline(data),
  });
}
