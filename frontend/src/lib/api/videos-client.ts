import { AI_PROXY } from "@/lib/api/paths";
import { getJson } from "@/lib/api/get-json";
import type { VideoMeta } from "@/lib/types/chat";

type VideosPayload = { videos?: unknown[] };

function normalizeVideo(raw: unknown): VideoMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const title = typeof v.title === "string" ? v.title : "";
  let link = typeof v.link === "string" ? v.link : "";
  const thumbnail_url =
    typeof v.thumbnail_url === "string"
      ? v.thumbnail_url
      : typeof v.thumbnailUrl === "string"
        ? v.thumbnailUrl
        : undefined;
  const videoId = typeof v.video_id === "string" ? v.video_id : undefined;
  if (!link && videoId) {
    link = `https://www.youtube.com/watch?v=${videoId}`;
  }
  if (!title && !link) return null;
  return { title: title || "YouTube video", link, thumbnail_url };
}

export async function fetchVideos(
  q: string,
  maxResults = 3,
): Promise<VideoMeta[]> {
  const params = new URLSearchParams({ q, max_results: String(maxResults) });
  const data = await getJson<VideosPayload>(
    `${AI_PROXY.videos}?${params.toString()}`,
  );
  const raw = data.videos ?? [];
  return raw
    .map(normalizeVideo)
    .filter((x): x is VideoMeta => x !== null)
    .slice(0, maxResults);
}
