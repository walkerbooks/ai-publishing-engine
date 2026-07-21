"use client";

import { useCallback, useState } from "react";
import { usePublishingStore } from "@/stores/publishing-store";
import { sendChatMessage } from "@/lib/api/chat-client";
import { extractUserNameFromMessages } from "@/lib/chat/welcome-flow";
import { newId } from "@/lib/utils/id";

export function useChatSend() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = useCallback(async (typed: string | null) => {
    const st = usePublishingStore.getState();
    let userText: string;
    if (st.pendingPrompt) {
      userText = st.pendingPrompt;
      st.setPendingPrompt(null);
    } else {
      const t = typed?.trim();
      if (!t) return;
      st.pushUserMessage(t);
      userText = t;
    }
    setBusy(true);
    setErr(null);
    try {
      const msgs = usePublishingStore.getState().chatMessages;
      const history = msgs.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await sendChatMessage(
        userText,
        history,
        usePublishingStore.getState().sessionId,
      );
      usePublishingStore.getState().pushAssistantMessage({
        id: newId(),
        role: "assistant",
        kind: "intake",
        content: res.content,
      });
      const n = extractUserNameFromMessages(
        usePublishingStore.getState().chatMessages,
      );
      if (n) usePublishingStore.getState().setUserName(n);
      if (res.intake_complete && res.book_spec) {
        usePublishingStore.getState().setIntakeResult(
          true,
          res.book_spec as Record<string, unknown>,
          res.book_id ?? null,
        );
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Chat failed");
      usePublishingStore.getState().setPendingPrompt(null);
      usePublishingStore.getState().popLastUserMessage();
    } finally {
      setBusy(false);
    }
  }, []);

  return { send, busy, err, clearErr: () => setErr(null) };
}
