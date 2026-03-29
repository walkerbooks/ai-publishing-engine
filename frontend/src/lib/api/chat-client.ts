import type { ChatApiResponse } from "@/lib/types/chat";
import { getAiAuthHeaders } from "@/lib/api/ai-auth-headers";
import { AI_PROXY } from "@/lib/api/paths";
import { postJson } from "@/lib/api/post-json";

export async function sendChatMessage(
  message: string,
  history: { role: string; content: string }[],
  sessionId: string | null,
): Promise<ChatApiResponse> {
  return postJson<ChatApiResponse>(
    AI_PROXY.chat,
    {
      message,
      history,
      session_id: sessionId,
    },
    { headers: getAiAuthHeaders() },
  );
}
