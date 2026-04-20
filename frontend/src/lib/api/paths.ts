/** Relative to Next.js origin — proxied to FastAPI under /api/... */
export const AI_PROXY = {
  chat: "/api/ai/chat",
  unifiedChatStream: "/api/ai/chat/unified/stream",
  outline: "/api/ai/outline",
  preview: "/api/ai/preview",
  videos: "/api/ai/videos",
  coverGenerate: "/api/ai/cover/generate-cover-image",
  coverGenerateVariants: "/api/ai/cover/generate-cover-variants",
} as const;
