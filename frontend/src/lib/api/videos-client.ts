import { AI_PROXY } from "@/lib/api/paths";
import { getJson } from "@/lib/api/get-json";
import type { VideoMeta } from "@/lib/types/chat";

type VideosPayload = { videos?: VideoMeta[] };

export async function fetchVideos(
  q: string,
  maxResults = 3,
): Promise<VideoMeta[]> {
  const params = new URLSearchParams({ q, max_results: String(maxResults) });
  const data = await getJson<VideosPayload>(
    `${AI_PROXY.videos}?${params.toString()}`,
  );
  return data.videos ?? [];
}
