import { getAiAuthHeaders } from "@/lib/api/ai-auth-headers";
import { AI_PROXY } from "@/lib/api/paths";
import { postJson } from "@/lib/api/post-json";

export type PreviewResponse = { preview_content?: string };

export async function fetchPreview(
  bookSpec: Record<string, unknown>,
  bookOutline: Record<string, unknown>,
): Promise<PreviewResponse> {
  return postJson(AI_PROXY.preview, {
    book_spec: bookSpec,
    book_outline: bookOutline,
  }, { headers: getAiAuthHeaders() });
}
