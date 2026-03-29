import { getAiAuthHeaders } from "@/lib/api/ai-auth-headers";
import { AI_PROXY } from "@/lib/api/paths";
import { postJson } from "@/lib/api/post-json";

export async function fetchOutline(
  bookSpec: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return postJson(AI_PROXY.outline, { book_spec: bookSpec }, { headers: getAiAuthHeaders() });
}
