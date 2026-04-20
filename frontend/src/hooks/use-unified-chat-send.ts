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
import { syncGuestOnboardingFromMessages } from "@/lib/chat/welcome-flow";
import { assertGuestMaySendNewThread } from "@/lib/guest/guest-send-guard";
import { useAuthStore } from "@/stores/auth-store";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { usePublishingStore } from "@/stores/publishing-store";
import { syncGuestPromotionLead } from "@/lib/api/promotion-client";

export type UnifiedSendOptions = {
  /** With collaborative brief on server, finalize intake + outline gate without re-running intake LLM. */
  collaborativeAck?: boolean;
};

export function useUnifiedChatSend() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const clearErr = () => setErr(null);
  const send = useCallback(async (typed: string | null, opts?: UnifiedSendOptions) => {
    const guestGate = assertGuestMaySendNewThread();
    if (!guestGate.ok) {
      setErr(guestGate.message);
      return;
    }
    useChatDirectoryStore.getState().clearGuestGateMessage();

    await ensureServerConversationBeforeSend();
    const pub = usePublishingStore.getState();

    let userText: string;
    if (pub.pendingPrompt) {
      userText = pub.pendingPrompt.trim();
      pub.setPendingPrompt(null);
      if (!userText) return;
      pub.pushUserMessage(userText);
    } else {
      const t = typed?.trim();
      if (!t && !opts?.collaborativeAck) return;
      userText = t || "Yes — that works for me. Please continue.";
      pub.pushUserMessage(userText);
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
      const st = usePublishingStore.getState();
      const msgs = st.chatMessages;
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

      const tryAck =
        Boolean(opts?.collaborativeAck) &&
        st.composerStep === "intake" &&
        st.intakeCollaborative;
      const ackSpec = tryAck ? st.bookSpec : null;
      const useCollaborativeAck = Boolean(
        tryAck &&
          ackSpec &&
          typeof ackSpec === "object" &&
          Object.keys(ackSpec).length > 0,
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
          intakeCollaborative: st.intakeCollaborative,
          intakeCollaborativeAck: useCollaborativeAck,
        },
        (event, data) => {
          handleUnifiedChatSseEvent(
            event,
            data,
            {
              pushAssistantMessage: st.pushAssistantMessage,
              appendAssistantDelta: st.appendAssistantDelta,
              patchChatMessage: st.patchChatMessage,
              setIntakeResult: st.setIntakeResult,
              setAwaitingGate: st.setAwaitingGate,
              setAssistantOutline: st.setAssistantOutline,
              setBookOutline: st.setBookOutline,
              setAssistantPreview: st.setAssistantPreview,
              setPreviewContent: st.setPreviewContent,
              setErr,
            },
            getUnifiedAssistantPlaceholder,
          );
        },
      );
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Unified chat failed");
    } finally {
      // Persist new assistant rows in chat order (await each append). Parallel appends race on
      // sequence assignment so the PayPal gate can end up *before* the preview row in DB; restore
      // then treats the preview bubble as "last assistant" and drops awaitingGate === "full".
      const after = usePublishingStore.getState().chatMessages;
      for (const m of after) {
        if (m.role === "assistant" && !messageIdsBeforeStream.has(m.id)) {
          await persistChatMessageIfAuthenticated(m);
        }
      }
      const { userName, guestEmail } = syncGuestOnboardingFromMessages(after);
      const pub = usePublishingStore.getState();
      if (userName) pub.setUserName(userName);
      if (guestEmail) pub.setGuestEmail(guestEmail);
      // End "streaming" state as soon as the assistant message is complete — not after promotion API.
      setBusy(false);
      void syncGuestPromotionLead(
        userName,
        guestEmail,
        useAuthStore.getState().isAuthenticated,
      );
    }
  }, []);

  return { send, busy, err, clearErr };
}

