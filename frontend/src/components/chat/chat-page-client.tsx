"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePayPalCheckout } from "@/hooks/use-paypal-checkout";
import { useVideoInjection } from "@/hooks/use-video-injection";
import { useUnifiedChatSend } from "@/hooks/use-unified-chat-send";
import { getAccessToken } from "@/lib/auth/access-token";
import { useAuthStore } from "@/stores/auth-store";
import { useAuthDialogRequestStore } from "@/stores/auth-dialog-request-store";
import { createInitialPublishingState } from "@/stores/publishing-types";
import { usePublishingStore } from "@/stores/publishing-store";
import { ensureGuestSessionWithServer } from "@/lib/api/guest-client";
import { hydrateGuestStoresFromPersistence } from "@/lib/guest/guest-hydrate";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { ChatShell } from "@/components/chat/shell/chat-shell";
import { FullBookPricingDialog } from "@/components/paypal/full-book-pricing-dialog";
import { useFullBookChatFlow } from "@/hooks/use-full-book-chat-flow";

export function ChatPageClient() {
  useVideoInjection();
  useFullBookChatFlow();
  const searchParams = useSearchParams();
  const setActiveBookId = usePublishingStore((s) => s.setActiveBookId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const b = searchParams.get("book")?.trim();
    if (b) setActiveBookId(b);
  }, [searchParams, setActiveBookId]);
  useEffect(() => {
    const wantsNew = searchParams.get("new") === "1";
    if (!wantsNew || !isAuthenticated) return;
    const pub = usePublishingStore.getState();
    const hasInProgressSession =
      pub.chatMessages.length > 0 ||
      pub.awaitingGate != null ||
      pub.bookOutline != null ||
      pub.intakeComplete ||
      pub.bookSpec != null;
    if (hasInProgressSession) return;
    useChatDirectoryStore.setState({ activeConversationId: null });
    usePublishingStore.setState(createInitialPublishingState());
  }, [searchParams, isAuthenticated]);
  const { send, busy, err, clearErr } = useUnifiedChatSend();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const hydrateConversationListFromServer = useChatDirectoryStore(
    (s) => s.hydrateConversationListFromServer,
  );
  const messages = usePublishingStore((s) => s.chatMessages);
  const awaitingGate = usePublishingStore((s) => s.awaitingGate);
  const bookOutline = usePublishingStore((s) => s.bookOutline);
  const conversationCount = useChatDirectoryStore((s) => s.conversations.length);

  const bookParam = searchParams.get("book")?.trim() ?? null;

  const prevAuthenticated = useRef(isAuthenticated);
  useEffect(() => {
    if (isAuthenticated) {
      void refreshProfile();
      void (async () => {
        await hydrateConversationListFromServer();
        const { promoteActiveGuestConversationToServer, restorePayPalThreadAfterReturn } =
          await import("@/lib/chat/conversation-sync");
        await promoteActiveGuestConversationToServer();
        if (bookParam) {
          await restorePayPalThreadAfterReturn(bookParam);
          usePublishingStore.getState().setActiveBookId(bookParam);
        }
      })();
    }
    if (prevAuthenticated.current && !isAuthenticated) {
      useChatDirectoryStore.setState({
        conversations: [],
        activeConversationId: null,
        listLoaded: false,
      });
      usePublishingStore.setState(createInitialPublishingState());
      void ensureGuestSessionWithServer().finally(() => {
        hydrateGuestStoresFromPersistence();
      });
    }
    prevAuthenticated.current = isAuthenticated;
  }, [isAuthenticated, bookParam, hydrateConversationListFromServer, refreshProfile]);
  const {
    startCheckout,
    loading: payPalLoading,
    error: payPalErr,
    clearError: clearPayPalErr,
  } = usePayPalCheckout();
  const [payPalGateErr, setPayPalGateErr] = useState<string | null>(null);
  const [fullBookPricingOpen, setFullBookPricingOpen] = useState(false);

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
    if (!getAccessToken()) {
      useAuthDialogRequestStore.getState().requestLogin();
      setPayPalGateErr(
        "Sign in or create an account to pay with PayPal — then tap the button again.",
      );
      return;
    }
    setFullBookPricingOpen(true);
  };

  const continueFullBookPayPal = () => {
    clearPayPalErr();
    const id = usePublishingStore.getState().activeBookId;
    if (!id) return;
    setFullBookPricingOpen(false);
    void startCheckout(id, "/chat");
  };
  const changePreview = () =>
    (usePublishingStore.getState().setAwaitingGate(null),
    usePublishingStore.getState().setComposerStep("preview"),
    usePublishingStore.getState().setComposerAction("revise"));

  return (
    <>
      <FullBookPricingDialog
        open={fullBookPricingOpen}
        onOpenChange={(open) => {
          setFullBookPricingOpen(open);
          if (!open) clearPayPalErr();
        }}
        loading={payPalLoading}
        error={payPalErr}
        onBuy={continueFullBookPayPal}
      />
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
          isAuthenticated={isAuthenticated}
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
    </>
  );
}
