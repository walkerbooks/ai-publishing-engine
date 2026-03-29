import { getAiAuthHeaders } from "@/lib/api/ai-auth-headers";
import { AI_PROXY } from "@/lib/api/paths";
import { drainSseBuffer } from "@/lib/stream/sse";

export type UnifiedChatInput = {
  message: string;
  history: Array<{ role: string; content: string }>;
  sessionId: string | null;
  step: "intake" | "outline" | "preview" | "full";
  action: "proceed" | "revise";
  bookSpec?: Record<string, unknown> | null;
  bookOutline?: Record<string, unknown> | null;
  /** Logged-in user display name — backend skips name onboarding and greets by name. */
  userDisplayName?: string | null;
};

export async function streamUnifiedChat(
  input: UnifiedChatInput,
  onEvent: (event: string, data: any) => void,
): Promise<void> {
  const res = await fetch(AI_PROXY.unifiedChatStream, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAiAuthHeaders(),
    },
    body: JSON.stringify({
      message: input.message,
      history: input.history,
      session_id: input.sessionId,
      step: input.step,
      action: input.action,
      book_spec: input.bookSpec ?? null,
      book_outline: input.bookOutline ?? null,
      user_display_name: input.userDisplayName ?? null,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) {
      let msg = "Too many AI requests. Try again shortly.";
      try {
        const j = JSON.parse(t) as { error?: string };
        if (j.error) msg = j.error;
      } catch {
        /* */
      }
      throw new Error(msg);
    }
    throw new Error(t || `Request failed: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Missing response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const { events, rest } = drainSseBuffer(buffer);
    buffer = rest;
    for (const e of events) onEvent(e.event, e.data ?? {});
  }
}

