"use client";

import { useCallback, useRef, useState } from "react";
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
import { getAccessToken, getUserEmail, getUserFirstName } from "@/lib/auth/access-token";
import { syncGuestOnboardingFromMessages } from "@/lib/chat/welcome-flow";
import { assertGuestMaySendNewThread } from "@/lib/guest/guest-send-guard";
import { mapUserError, type MappedUserError } from "@/lib/errors/user-error-message";
import { useAuthStore } from "@/stores/auth-store";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { usePublishingStore } from "@/stores/publishing-store";
import { syncGuestPromotionLead } from "@/lib/api/promotion-client";

export type UnifiedSendOptions = {
  /** With collaborative brief on server, finalize intake + outline gate without re-running intake LLM. */
  collaborativeAck?: boolean;
};

type SendAttempt = {
  userText: string;
  opts?: UnifiedSendOptions;
};

function removeFailedStreamAssistantRows(messageIdsBeforeStream: Set<string>) {
  usePublishingStore.setState((s) => ({
    chatMessages: s.chatMessages.filter(
      (m) => m.role !== "assistant" || messageIdsBeforeStream.has(m.id),
    ),
  }));
}

export function useUnifiedChatSend() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<MappedUserError | null>(null);
  const lastAttemptRef = useRef<SendAttempt | null>(null);

  const clearErr = () => setErr(null);

  const applyError = useCallback((raw: unknown) => {
    setErr(mapUserError(raw, "chat"));
  }, []);

  const runStream = useCallback(
    async (attempt: SendAttempt, messageIdsBeforeStream: Set<string>) => {
      const st = usePublishingStore.getState();
      const msgs = st.chatMessages;
      const history =
        st.composerStep === "intake"
          ? msgs
              .filter((m) => m.role === "user" || m.kind === "intake" || !m.kind)
              .map((m) => ({ role: m.role, content: m.content }))
          : [];

      const auth = useAuthStore.getState();
      const token = getAccessToken();
      const isAuthed = auth.isAuthenticated || Boolean(token);
      const userDisplayName = authGreetingName(
        isAuthed,
        auth.firstName ?? getUserFirstName(),
        auth.email ?? getUserEmail(),
      );

      const tryAck =
        Boolean(attempt.opts?.collaborativeAck) &&
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
          message: attempt.userText,
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
              setErr: (msg) => {
                removeFailedStreamAssistantRows(messageIdsBeforeStream);
                applyError(msg);
              },
            },
            getUnifiedAssistantPlaceholder,
          );
        },
      );
    },
    [applyError],
  );

  const send = useCallback(
    async (typed: string | null, opts?: UnifiedSendOptions, skipPushUser = false) => {
      const guestGate = assertGuestMaySendNewThread();
      if (!guestGate.ok) {
        setErr(mapUserError(guestGate.message, "chat"));
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
        if (!skipPushUser) pub.pushUserMessage(userText);
      } else {
        const t = typed?.trim();
        if (!t && !opts?.collaborativeAck) return;
        userText = t || "Yes — that works for me. Please continue.";
        if (!skipPushUser) pub.pushUserMessage(userText);
      }

      const userMsg = usePublishingStore.getState().chatMessages.at(-1);
      if (userMsg?.role === "user") {
        void persistChatMessageIfAuthenticated(userMsg);
      }

      const attempt: SendAttempt = { userText, opts };
      lastAttemptRef.current = attempt;

      setBusy(true);
      clearErr();

      const messageIdsBeforeStream = new Set(
        usePublishingStore.getState().chatMessages.map((m) => m.id),
      );

      try {
        await runStream(attempt, messageIdsBeforeStream);
      } catch (e2) {
        removeFailedStreamAssistantRows(messageIdsBeforeStream);
        applyError(e2);
      } finally {
        const after = usePublishingStore.getState().chatMessages;
        for (const m of after) {
          if (m.role === "assistant" && !messageIdsBeforeStream.has(m.id)) {
            await persistChatMessageIfAuthenticated(m);
          }
        }
        const { userName, guestEmail } = syncGuestOnboardingFromMessages(after);
        const pubAfter = usePublishingStore.getState();
        if (userName) pubAfter.setUserName(userName);
        if (guestEmail) {
          pubAfter.setGuestEmail(guestEmail);
          // Prefer collaborative intake for signed-out guests after email is known.
          if (!useAuthStore.getState().isAuthenticated) {
            pubAfter.setIntakeCollaborative(true);
          }
        }
        setBusy(false);
        void syncGuestPromotionLead(
          userName,
          guestEmail,
          useAuthStore.getState().isAuthenticated,
        );
      }
    },
    [applyError, clearErr, runStream],
  );

  const retry = useCallback(async () => {
    const attempt = lastAttemptRef.current;
    if (!attempt || busy) return;
    clearErr();

    const messageIdsBeforeStream = new Set(
      usePublishingStore.getState().chatMessages.map((m) => m.id),
    );

    setBusy(true);
    try {
      await runStream(attempt, messageIdsBeforeStream);
    } catch (e) {
      removeFailedStreamAssistantRows(messageIdsBeforeStream);
      applyError(e);
    } finally {
      const after = usePublishingStore.getState().chatMessages;
      for (const m of after) {
        if (m.role === "assistant" && !messageIdsBeforeStream.has(m.id)) {
          await persistChatMessageIfAuthenticated(m);
        }
      }
      setBusy(false);
    }
  }, [applyError, busy, clearErr, runStream]);

  return {
    send,
    retry,
    busy,
    err,
    clearErr,
  };
}
