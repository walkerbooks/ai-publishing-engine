"use client";

import { useCallback, useState } from "react";
import {
  ensureServerConversationBeforeSend,
  persistChatMessageIfAuthenticated,
} from "@/lib/chat/conversation-sync";
import { streamUnifiedChat } from "@/lib/api/stream-unified-chat";
import {
  getUnifiedAssistantPlaceholder,
} from "@/lib/chat/unified-chat/placeholders";
import { handleUnifiedChatSseEvent } from "@/lib/chat/unified-chat/event-handler";
import { authGreetingName } from "@/lib/auth/greeting-name";
import { useAuthStore } from "@/stores/auth-store";
import { usePublishingStore } from "@/stores/publishing-store";

export function useUnifiedChatSend() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const clearErr = () => setErr(null);
  const send = useCallback(async (typed: string | null) => {
    await ensureServerConversationBeforeSend();
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

    const userMsg = usePublishingStore.getState().chatMessages.at(-1);
    if (userMsg?.role === "user") {
      void persistChatMessageIfAuthenticated(userMsg);
    }

    setBusy(true);
    clearErr();

    const messageIdsBeforeStream = new Set(
      usePublishingStore.getState().chatMessages.map((m) => m.id),
    );

    try {
      const msgs = usePublishingStore.getState().chatMessages;
      const history =
        st.composerStep === "intake"
          ? msgs
              .filter((m) => m.role === "user" || m.kind === "intake" || !m.kind)
              .map((m) => ({ role: m.role, content: m.content }))
          : [];

      const auth = useAuthStore.getState();
      const userDisplayName = authGreetingName(
        auth.isAuthenticated,
        auth.firstName,
        auth.email,
      );

      await streamUnifiedChat(
        {
          message: userText,
          history,
          sessionId: st.sessionId,
          step: st.composerStep,
          action: st.composerAction,
          bookSpec: st.bookSpec,
          bookOutline: st.bookOutline,
          userDisplayName,
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
      // Persist every assistant message created this turn. The last bubble is often a
      // gate after outline/preview; only persisting .at(-1) skipped outline_json / preview_markdown.
      const after = usePublishingStore.getState().chatMessages;
      for (const m of after) {
        if (m.role === "assistant" && !messageIdsBeforeStream.has(m.id)) {
          void persistChatMessageIfAuthenticated(m);
        }
      }
      setBusy(false);
    }
  }, []);

  return { send, busy, err, clearErr };
}

