"use client";

import { useCallback, useState } from "react";
import { usePublishingStore } from "@/stores/publishing-store";
import { streamUnifiedChat } from "@/lib/api/stream-unified-chat";
import {
  getUnifiedAssistantPlaceholder,
} from "@/lib/chat/unified-chat/placeholders";
import { handleUnifiedChatSseEvent } from "@/lib/chat/unified-chat/event-handler";

export function useUnifiedChatSend() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const clearErr = () => setErr(null);
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
    clearErr();

    try {
      const msgs = usePublishingStore.getState().chatMessages;
      const history =
        st.composerStep === "intake"
          ? msgs
              .filter((m) => m.role === "user" || m.kind === "intake" || !m.kind)
              .map((m) => ({ role: m.role, content: m.content }))
          : [];

      await streamUnifiedChat(
        {
          message: userText,
          history,
          sessionId: st.sessionId,
          step: st.composerStep,
          action: st.composerAction,
          bookSpec: st.bookSpec,
          bookOutline: st.bookOutline,
        },
        (event, data) => {
          handleUnifiedChatSseEvent(
            event,
            data,
            {
              pushAssistantMessage: st.pushAssistantMessage,
              appendAssistantDelta: st.appendAssistantDelta,
              setIntakeResult: st.setIntakeResult,
              setAwaitingGate: st.setAwaitingGate,
              setAssistantOutline: st.setAssistantOutline,
              setBookOutline: st.setBookOutline,
              setAssistantPreview: st.setAssistantPreview,
              setErr,
            },
            getUnifiedAssistantPlaceholder,
          );
        },
      );
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Unified chat failed");
    } finally {
      setBusy(false);
    }
  }, []);

  return { send, busy, err, clearErr };
}

