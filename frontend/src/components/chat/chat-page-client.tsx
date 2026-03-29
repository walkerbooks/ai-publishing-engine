"use client";
import { useEffect, useRef, useState } from "react";
import { usePayPalCheckout } from "@/hooks/use-paypal-checkout";
import { useVideoInjection } from "@/hooks/use-video-injection";
import { useUnifiedChatSend } from "@/hooks/use-unified-chat-send";
import { useAuthStore } from "@/stores/auth-store";
import { createInitialPublishingState } from "@/stores/publishing-types";
import { usePublishingStore } from "@/stores/publishing-store";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { ChatShell } from "@/components/chat/shell/chat-shell";

export function ChatPageClient() {
  useVideoInjection();
  const { send, busy, err, clearErr } = useUnifiedChatSend();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const hydrateConversationListFromServer = useChatDirectoryStore(
    (s) => s.hydrateConversationListFromServer,
  );
  const messages = usePublishingStore((s) => s.chatMessages);
  const awaitingGate = usePublishingStore((s) => s.awaitingGate);
  const bookOutline = usePublishingStore((s) => s.bookOutline);
  const conversationCount = useChatDirectoryStore((s) => s.conversations.length);

  const prevAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    if (isAuthenticated) {
      void refreshProfile();
      void hydrateConversationListFromServer();
    }
    if (prevAuthenticated.current && !isAuthenticated) {
      useChatDirectoryStore.setState({
        conversations: [],
        activeConversationId: null,
        listLoaded: false,
      });
      usePublishingStore.setState(createInitialPublishingState());
    }
    prevAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, hydrateConversationListFromServer, refreshProfile]);
  const {
    startCheckout,
    loading: payPalLoading,
    error: payPalErr,
    clearError: clearPayPalErr,
  } = usePayPalCheckout();
  const [payPalGateErr, setPayPalGateErr] = useState<string | null>(null);

  const hasThread = messages.length > 0;
  const showConversationChrome =
    isAuthenticated || hasThread || conversationCount > 0;
  const [outlineMobileOpen, setOutlineMobileOpen] = useState(false);

  useEffect(() => {
    if (!bookOutline) setOutlineMobileOpen(false);
  }, [bookOutline]);

  const proceedToOutline = () =>
    (usePublishingStore.getState().setAwaitingGate(null),
    usePublishingStore.getState().setComposerStep("outline"),
    usePublishingStore.getState().setComposerAction("proceed"),
    void send("Proceed"));
  const changeRequirements = () =>
    (usePublishingStore.getState().setAwaitingGate(null),
    usePublishingStore.getState().setComposerStep("intake"),
    usePublishingStore.getState().setComposerAction("proceed"));
  const proceedToPreview = () =>
    (usePublishingStore.getState().setAwaitingGate(null),
    usePublishingStore.getState().setComposerStep("preview"),
    usePublishingStore.getState().setComposerAction("proceed"),
    void send("Proceed"));
  const changeOutline = () =>
    (usePublishingStore.getState().setAwaitingGate(null),
    usePublishingStore.getState().setComposerStep("outline"),
    usePublishingStore.getState().setComposerAction("revise"));
  const unlockFull = () => {
    clearPayPalErr();
    setPayPalGateErr(null);
    const id = usePublishingStore.getState().activeBookId;
    if (!id) {
      setPayPalGateErr("No book ID yet — continue until a book is created, then try again.");
      return;
    }
    void startCheckout(id, "/chat");
  };
  const changePreview = () =>
    (usePublishingStore.getState().setAwaitingGate(null),
    usePublishingStore.getState().setComposerStep("preview"),
    usePublishingStore.getState().setComposerAction("revise"));

  return (
    <ChatShell
      showConversationChrome={showConversationChrome}
      showGeneratedOutlineButton={Boolean(bookOutline)}
      onOpenGeneratedOutline={() => setOutlineMobileOpen(true)}
      onSidebarWillOpen={() => setOutlineMobileOpen(false)}
    >
      <ChatWorkspace
        hasThread={hasThread}
        err={err}
        busy={busy}
        messages={messages}
        bookOutline={bookOutline}
        awaitingGate={awaitingGate}
        outlineMobileOpen={outlineMobileOpen}
        onCloseOutlineMobile={() => setOutlineMobileOpen(false)}
        onSend={(t) => void send(t)}
        clearErr={clearErr}
        proceedToOutline={proceedToOutline}
        changeRequirements={changeRequirements}
        proceedToPreview={proceedToPreview}
        changeOutline={changeOutline}
        unlockFull={unlockFull}
        changePreview={changePreview}
        payPalLoading={payPalLoading}
        payPalError={payPalGateErr ?? payPalErr}
      />
    </ChatShell>
  );
}
