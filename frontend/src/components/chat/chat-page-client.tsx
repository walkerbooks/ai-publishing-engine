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
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { ChatShell } from "@/components/chat/shell/chat-shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FullBookPricingDialog } from "@/components/paypal/full-book-pricing-dialog";
import type { FullBookPackageTier } from "@/lib/paypal/full-book-packages";
import type { ChatMessage } from "@/lib/types/chat";
import {
  checkFullGenerationEntitlement,
  fetchSubscriptionEntitlement,
  formatNextFullGenerationSlot,
} from "@/lib/api/subscriptions-client";
import { useFullBookChatFlow } from "@/hooks/use-full-book-chat-flow";
import { threadPastBookKickoff } from "@/lib/chat/book-kickoff";
import { getUnifiedAssistantPlaceholder } from "@/lib/chat/unified-chat/placeholders";

const KICKOFF_ASSISTANT_LOADER_MS = 550;

const FULL_BOOK_COOLDOWN_POPUP_FALLBACK =
  "You still have a full book on your plan. The next generation opens when your plan's cooldown ends.";

function scheduleKickoffAssistantReveal(
  id: string,
  finalContent: string,
  timers: ReturnType<typeof setTimeout>[],
) {
  const pub = usePublishingStore.getState();
  pub.pushAssistantMessage({
    id,
    role: "assistant",
    kind: "intake",
    content: getUnifiedAssistantPlaceholder("intake", ""),
  } as ChatMessage);
  const t = setTimeout(() => {
    usePublishingStore.getState().patchChatMessage(id, { content: finalContent });
    const i = timers.indexOf(t);
    if (i >= 0) timers.splice(i, 1);
  }, KICKOFF_ASSISTANT_LOADER_MS);
  timers.push(t);
}

type BookKickoffStage =
  | "choice"
  | "title"
  | "subtitle"
  | "summary"
  | "general_idea"
  | "done";

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
  const previewContent = usePublishingStore((s) => s.previewContent);
  const composerStep = usePublishingStore((s) => s.composerStep);
  const conversationCount = useChatDirectoryStore((s) => s.conversations.length);
  const listLoaded = useChatDirectoryStore((s) => s.listLoaded);

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
        listLoaded: true,
      });
      usePublishingStore.setState(createInitialPublishingState());
      void ensureGuestSessionWithServer();
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
  const [fullBookGateMode, setFullBookGateMode] = useState<
    "loading" | "generate" | "cooldown" | "paypal"
  >("paypal");
  const [fullBookCooldownSummary, setFullBookCooldownSummary] = useState<
    string | null
  >(null);
  const [fullBookCooldownPopupDismissed, setFullBookCooldownPopupDismissed] =
    useState(false);
  const lastCooldownPopupSummaryRef = useRef("");
  const [generateFullBusy, setGenerateFullBusy] = useState(false);
  const [bookKickoffStage, setBookKickoffStage] = useState<BookKickoffStage>("choice");
  const [bookKickoffTitle, setBookKickoffTitle] = useState("");
  const [bookKickoffSubtitle, setBookKickoffSubtitle] = useState("");
  const kickoffLoaderTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      kickoffLoaderTimersRef.current.forEach(clearTimeout);
      kickoffLoaderTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (awaitingGate !== "full") return;
    const token = getAccessToken();
    if (!isAuthenticated || !token) {
      setFullBookGateMode("paypal");
      setFullBookCooldownSummary(null);
      return;
    }
    let cancelled = false;
    setFullBookGateMode("loading");
    setFullBookCooldownSummary(null);
    void (async () => {
      try {
        const ent = await fetchSubscriptionEntitlement(token);
        if (cancelled) return;
        if (ent.has_entitlement && ent.can_start_full_generation) {
          setFullBookGateMode("generate");
          setFullBookCooldownSummary(null);
        } else if (ent.has_entitlement && !ent.can_start_full_generation) {
          setFullBookGateMode("cooldown");
          const when = formatNextFullGenerationSlot(ent.next_full_generation_after);
          const creditLine =
            ent.books_remaining > 0
              ? ent.books_remaining === 1
                ? "You have 1 full book credit left. "
                : `You have ${ent.books_remaining} full book credits left. `
              : "";
          setFullBookCooldownSummary(
            `${creditLine}Your plan allows one full book every 24 hours. Next slot: ${when}.`,
          );
        } else {
          setFullBookGateMode("paypal");
          setFullBookCooldownSummary(null);
        }
      } catch {
        if (!cancelled) {
          setFullBookGateMode("paypal");
          setFullBookCooldownSummary(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [awaitingGate, isAuthenticated]);

  useEffect(() => {
    if (awaitingGate !== "full") {
      setFullBookCooldownPopupDismissed(false);
      lastCooldownPopupSummaryRef.current = "";
    }
  }, [awaitingGate]);

  useEffect(() => {
    if (fullBookGateMode !== "cooldown") return;
    const t = (fullBookCooldownSummary ?? "").trim();
    if (!t) return;
    if (t !== lastCooldownPopupSummaryRef.current) {
      lastCooldownPopupSummaryRef.current = t;
      setFullBookCooldownPopupDismissed(false);
    }
  }, [fullBookGateMode, fullBookCooldownSummary]);

  /** Guests and first-time signed-in users use the YouTube welcome path; returning signed-in users get the title/summary kickoff. */
  useEffect(() => {
    if (!listLoaded) return;
    if (!isAuthenticated) {
      setBookKickoffStage("done");
      return;
    }
    if (conversationCount === 0) {
      setBookKickoffStage("done");
    } else if (messages.length === 0) {
      setBookKickoffStage("choice");
    }
  }, [listLoaded, isAuthenticated, conversationCount, messages.length]);

  /** Re-opened threads default kickoff stage to "choice" — snap to done once outline/preview exists. */
  useEffect(() => {
    if (!listLoaded || !isAuthenticated) return;
    if (
      !threadPastBookKickoff({
        awaitingGate,
        bookOutline,
        previewContent,
        composerStep,
        messages,
      })
    ) {
      return;
    }
    setBookKickoffStage((stage) => (stage !== "done" ? "done" : stage));
  }, [
    listLoaded,
    isAuthenticated,
    messages,
    awaitingGate,
    bookOutline,
    previewContent,
    composerStep,
  ]);

  useEffect(() => {
    if (messages.length) return;
    if (bookKickoffStage !== "choice") return;
    if (!isAuthenticated || !listLoaded || conversationCount === 0) return;
    const id = "book-kickoff-choice";
    const exists = usePublishingStore.getState().chatMessages.some((m) => m.id === id);
    if (exists) return;
    scheduleKickoffAssistantReveal(
      id,
      "Hi! I'm glad you're here.\n\nBefore we dive in, do you already have a working title, subtitle, and a short summary in mind?",
      kickoffLoaderTimersRef.current,
    );
  }, [messages.length, bookKickoffStage, isAuthenticated, listLoaded, conversationCount]);

  const startNormalBookFlow = (idea: string) => {
    setBookKickoffStage("done");
    usePublishingStore.getState().setIntakeCollaborative(true);
    const finalPrompt = `Let's build this together. Here's my general idea: ${idea}`;
    void send(finalPrompt);
  };

  const startCompleteIdeaFlow = (summary: string) => {
    setBookKickoffStage("done");
    usePublishingStore.getState().setIntakeCollaborative(false);
    const finalPrompt =
      `Here's my book concept:\n` +
      `Title: ${bookKickoffTitle}\n` +
      `Subtitle: ${bookKickoffSubtitle}\n` +
      `Summary: ${summary}`;
    void send(finalPrompt);
  };

  const handleBookKickoffOption = (option: "start_together" | "complete_idea") => {
    if (bookKickoffStage !== "choice") return;
    const pub = usePublishingStore.getState();
    if (option === "complete_idea") {
      pub.pushUserMessage("I have a full concept ready.");
      scheduleKickoffAssistantReveal(
        crypto.randomUUID(),
        "What's the working title for your book?",
        kickoffLoaderTimersRef.current,
      );
      setBookKickoffStage("title");
      return;
    }
    pub.pushUserMessage("No, let's build it together.");
    scheduleKickoffAssistantReveal(
      crypto.randomUUID(),
      "What's the book about in a sentence or two?",
      kickoffLoaderTimersRef.current,
    );
    setBookKickoffStage("general_idea");
  };

  const handleSend = (text: string) => {
    const value = text.trim();
    if (!value) return;
    const pub = usePublishingStore.getState();
    if (bookKickoffStage === "title") {
      pub.pushUserMessage(value);
      setBookKickoffTitle(value);
      scheduleKickoffAssistantReveal(
        crypto.randomUUID(),
        "Nice. What subtitle would you like?",
        kickoffLoaderTimersRef.current,
      );
      setBookKickoffStage("subtitle");
      return;
    }
    if (bookKickoffStage === "subtitle") {
      pub.pushUserMessage(value);
      setBookKickoffSubtitle(value);
      scheduleKickoffAssistantReveal(
        crypto.randomUUID(),
        "Great. Give me a 2-3 sentence summary of the book.",
        kickoffLoaderTimersRef.current,
      );
      setBookKickoffStage("summary");
      return;
    }
    if (bookKickoffStage === "summary") {
      startCompleteIdeaFlow(value);
      return;
    }
    if (bookKickoffStage === "general_idea") {
      startNormalBookFlow(value);
      return;
    }
    void send(value);
  };

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
  const payForFullBook = () => {
    clearPayPalErr();
    setPayPalGateErr(null);
    const id = usePublishingStore.getState().activeBookId;
    if (!id) {
      setPayPalGateErr(
        "We're almost there. Finish the steps until your book is created, then try again.",
      );
      return;
    }
    if (!getAccessToken()) {
      useAuthDialogRequestStore.getState().requestLogin();
      setPayPalGateErr(
        "Please sign in or create an account to pay with PayPal, then tap the button again.",
      );
      return;
    }
    setFullBookPricingOpen(true);
  };

  const generateFullWithSubscription = async () => {
    clearPayPalErr();
    setPayPalGateErr(null);
    const id = usePublishingStore.getState().activeBookId;
    if (!id) {
      setPayPalGateErr(
        "We're almost there. Finish the steps until your book is created, then try again.",
      );
      return;
    }
    const token = getAccessToken();
    if (!token) {
      useAuthDialogRequestStore.getState().requestLogin();
      setPayPalGateErr("Please sign in to use your subscription credits.");
      return;
    }
    setGenerateFullBusy(true);
    try {
      const gate = await checkFullGenerationEntitlement(token);
      if (!gate.ok) {
        setPayPalGateErr(gate.message);
        try {
          const ent = await fetchSubscriptionEntitlement(token);
          if (ent.has_entitlement && ent.can_start_full_generation) {
            setFullBookGateMode("generate");
            setFullBookCooldownSummary(null);
          } else if (ent.has_entitlement && !ent.can_start_full_generation) {
            setFullBookGateMode("cooldown");
            const when = formatNextFullGenerationSlot(ent.next_full_generation_after);
            const creditLine =
              ent.books_remaining > 0
                ? ent.books_remaining === 1
                  ? "You have 1 full book credit left. "
                  : `You have ${ent.books_remaining} full book credits left. `
                : "";
            setFullBookCooldownSummary(
              `${creditLine}Your plan allows one full book every 24 hours. Next slot: ${when}.`,
            );
          } else {
            setFullBookGateMode("paypal");
            setFullBookCooldownSummary(null);
          }
        } catch {
          setFullBookGateMode("paypal");
          setFullBookCooldownSummary(null);
        }
        return;
      }
      usePublishingStore.getState().setSubscriptionFullGenUnlocked(true);
      usePublishingStore.getState().setAwaitingGate(null);
    } finally {
      setGenerateFullBusy(false);
    }
  };

  const continueFullBookPayPal = (tier: FullBookPackageTier) => {
    clearPayPalErr();
    const id = usePublishingStore.getState().activeBookId;
    if (!id) return;
    setFullBookPricingOpen(false);
    void startCheckout(id, "/chat", tier);
  };
  const changePreview = () =>
    (usePublishingStore.getState().setAwaitingGate(null),
    usePublishingStore.getState().setComposerStep("preview"),
    usePublishingStore.getState().setComposerAction("revise"));

  const handleCollaborativeAgree = () => {
    void send("Yes — that works for me. Please continue.", {
      collaborativeAck: true,
    });
  };
  const handleCollaborativeQuickChange = (message: string) => {
    void handleSend(message);
  };
  const handleCollaborativeChangeSend = (text: string) => {
    void handleSend(`I'd like to change something: ${text}`);
  };

  const fullBookCooldownPopupBody =
    fullBookCooldownSummary?.trim() || FULL_BOOK_COOLDOWN_POPUP_FALLBACK;
  const showFullBookCooldownDialog =
    awaitingGate === "full" &&
    fullBookGateMode === "cooldown" &&
    Boolean(fullBookCooldownSummary?.trim()) &&
    !fullBookCooldownPopupDismissed;

  return (
    <>
      <Dialog
        open={showFullBookCooldownDialog}
        onOpenChange={(open) => {
          if (!open) setFullBookCooldownPopupDismissed(true);
        }}
      >
        <DialogContent className="border-border dark:border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>When you can generate your full book</DialogTitle>
            <DialogDescription className="text-left text-sm leading-relaxed text-foreground dark:text-zinc-200">
              {fullBookCooldownPopupBody}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              onClick={() => setFullBookCooldownPopupDismissed(true)}
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
          onSend={handleSend}
          clearErr={clearErr}
          proceedToOutline={proceedToOutline}
          changeRequirements={changeRequirements}
          proceedToPreview={proceedToPreview}
          changeOutline={changeOutline}
          payForFullBook={payForFullBook}
          generateFullWithSubscription={() => void generateFullWithSubscription()}
          fullBookGateMode={fullBookGateMode}
          generateFullBusy={generateFullBusy}
          changePreview={changePreview}
          payPalLoading={payPalLoading}
          payPalError={payPalGateErr ?? payPalErr}
          bookKickoffStage={bookKickoffStage}
          onBookKickoffOptionSelect={handleBookKickoffOption}
          onBookKickoffInputSend={handleSend}
          onCollaborativeAgree={handleCollaborativeAgree}
          onCollaborativeQuickChange={handleCollaborativeQuickChange}
          onCollaborativeChangeSend={handleCollaborativeChangeSend}
        />
      </ChatShell>
    </>
  );
}
