"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import type { ChatMessage } from "@/lib/types/chat";
import { newId } from "@/lib/utils/id";
import {
  checkFullGenerationEntitlement,
  fetchSubscriptionEntitlement,
  formatNextFullGenerationSlot,
} from "@/lib/api/subscriptions-client";
import { persistBookDescriptionToGo } from "@/lib/book/book-description-payload";
import { useFullBookChatFlow } from "@/hooks/use-full-book-chat-flow";
import { threadPastBookKickoff } from "@/lib/chat/book-kickoff";
import {
  formatTitleConfirmAskCopy,
  specTitleKey,
  type TitleConfirmStage,
} from "@/lib/chat/title-confirm";
import {
  buildBookCoverPrompt,
  COVER_VARIANT_COUNT,
} from "@/lib/chat/cover-prompt";
import { persistChatMessageIfAuthenticated } from "@/lib/chat/conversation-sync";
import { syncGuestPromotionLead } from "@/lib/api/promotion-client";
import {
  isWelcomeVideosSettledForMessage,
  shouldShowGuestEmailCapture,
  syncGuestOnboardingFromMessages,
} from "@/lib/chat/welcome-flow";
import { getUnifiedAssistantPlaceholder } from "@/lib/chat/unified-chat/placeholders";
import { generateCoverVariantsForChat } from "@/lib/api/cover-client";
import {
  mapUserError,
  type MappedUserError,
} from "@/lib/errors/user-error-message";

const KICKOFF_ASSISTANT_LOADER_MS = 550;

/** Stable id for the title/subtitle/summary kickoff bubble (logged-in empty thread + post-welcome paths). */
const BOOK_KICKOFF_CHOICE_MESSAGE_ID = "book-kickoff-choice";

const BOOK_KICKOFF_CHOICE_COPY =
  "Hi! I'm glad you're here.\n\nBefore we dive in, do you already have a working title, subtitle, and a short summary in mind?";

/** When true, cover generates without a $1 PayPal checkout (local/testing). Production: wire checkout then set false. */
const COVER_PAYMENT_BYPASS =
  process.env.NEXT_PUBLIC_COVER_PAYMENT_BYPASS === "true";

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
  | "before_choice"
  | "choice"
  | "title"
  | "subtitle"
  | "summary"
  | "general_idea"
  | "done";

export function ChatPageClient() {
  useVideoInjection();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setActiveBookId = usePublishingStore((s) => s.setActiveBookId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const skipAdminChatRedirect = searchParams.get("app") === "1";

  useEffect(() => {
    if (skipAdminChatRedirect) return;
    if (role !== "admin") return;
    router.replace("/admin");
  }, [role, router, skipAdminChatRedirect]);

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
  const { send, busy, err, clearErr, retry } = useUnifiedChatSend();
  const [coverErr, setCoverErr] = useState<MappedUserError | null>(null);
  const [coverGenBusy, setCoverGenBusy] = useState(false);
  const [coverPaymentBlockedOpen, setCoverPaymentBlockedOpen] = useState(false);
  const [coverVariantUrls, setCoverVariantUrls] = useState<string[] | null>(null);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const hydrateConversationListFromServer = useChatDirectoryStore(
    (s) => s.hydrateConversationListFromServer,
  );
  const messages = usePublishingStore((s) => s.chatMessages);
  const awaitingGate = usePublishingStore((s) => s.awaitingGate);
  const bookOutline = usePublishingStore((s) => s.bookOutline);
  const bookSpec = usePublishingStore((s) => s.bookSpec);
  const previewContent = usePublishingStore((s) => s.previewContent);
  const composerStep = usePublishingStore((s) => s.composerStep);
  const conversationCount = useChatDirectoryStore((s) => s.conversations.length);
  const listLoaded = useChatDirectoryStore((s) => s.listLoaded);

  const bookParam = searchParams.get("book")?.trim() ?? null;

  useLayoutEffect(() => {
    const paid = searchParams.get("paid") === "1";
    const withCover = searchParams.get("with_cover") === "1";
    if (!paid && !withCover) return;

    if (paid) {
      usePublishingStore.getState().setMockPayment(true);
    }
    if (withCover) {
      usePublishingStore.getState().setPostPayCoverFlowActive(true);
      usePublishingStore.getState().setPostPayFrontMatterLocked(false);
      usePublishingStore.getState().removeIncompleteFullBookMessages();
      usePublishingStore.getState().setAwaitingGate("post_preview");
    } else if (paid) {
      usePublishingStore.getState().setAwaitingGate("full");
    }

    const path =
      typeof window !== "undefined" ? window.location.pathname : "/chat";
    const params = new URLSearchParams(searchParams.toString());
    params.delete("paid");
    params.delete("with_cover");
    const q = params.toString();
    router.replace(q ? `${path}?${q}` : path, { scroll: false });
  }, [searchParams, router]);

  const { retryFullBook } = useFullBookChatFlow();

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
  const [payPalGateErr, setPayPalGateErr] = useState<MappedUserError | null>(null);
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
  const [bookKickoffStage, setBookKickoffStage] = useState<BookKickoffStage>("before_choice");
  const [bookKickoffTitle, setBookKickoffTitle] = useState("");
  const [bookKickoffSubtitle, setBookKickoffSubtitle] = useState("");
  const [titleConfirmStage, setTitleConfirmStage] =
    useState<TitleConfirmStage>("pending");
  const [titleConfirmTitle, setTitleConfirmTitle] = useState("");
  const titleConfirmDoneKeyRef = useRef<string | null>(null);
  const kickoffLoaderTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Logged-in first message: inject kickoff once after welcome videos settle on the first assistant reply. */
  const loggedInPostWelcomeKickoffRef = useRef(false);

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

  /**
   * Kickoff stage baseline: guests stay in `before_choice` until name/email/videos complete, then we
   * move to `choice`. First-time signed-in users use `before_choice` until after welcome videos on
   * the first assistant reply; returning users with an empty thread jump straight to `choice`.
   */
  useEffect(() => {
    if (!listLoaded) return;
    if (!isAuthenticated) {
      if (messages.length === 0) {
        setBookKickoffStage("before_choice");
      }
      return;
    }
    if (conversationCount === 0) {
      if (messages.length === 0) {
        setBookKickoffStage("before_choice");
      }
      return;
    }
    if (messages.length === 0) {
      setBookKickoffStage("choice");
    }
  }, [listLoaded, isAuthenticated, conversationCount, messages.length]);

  useEffect(() => {
    if (bookKickoffStage === "before_choice" && messages.length < 2) {
      loggedInPostWelcomeKickoffRef.current = false;
    }
  }, [bookKickoffStage, messages.length]);

  /** After first assistant reply + welcome videos (logged-in, `before_choice`), insert title/summary kickoff. */
  useEffect(() => {
    if (!listLoaded || !isAuthenticated) return;
    if (bookKickoffStage !== "before_choice") return;
    if (loggedInPostWelcomeKickoffRef.current) return;
    const msgs = usePublishingStore.getState().chatMessages;
    if (msgs.length < 2) return;
    const last = msgs[msgs.length - 1];
    if (last.role !== "assistant") return;
    if (!isWelcomeVideosSettledForMessage(last)) return;
    if (msgs.some((m) => m.id === BOOK_KICKOFF_CHOICE_MESSAGE_ID)) return;
    loggedInPostWelcomeKickoffRef.current = true;
    setBookKickoffStage("choice");
    scheduleKickoffAssistantReveal(
      BOOK_KICKOFF_CHOICE_MESSAGE_ID,
      BOOK_KICKOFF_CHOICE_COPY,
      kickoffLoaderTimersRef.current,
    );
  }, [listLoaded, isAuthenticated, bookKickoffStage, messages]);

  /** Snap to done once outline/preview exists (guest or authed). */
  useEffect(() => {
    if (!listLoaded) return;
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
    messages,
    awaitingGate,
    bookOutline,
    previewContent,
    composerStep,
  ]);

  /**
   * If intake already pitched a working title (or similar checkpoint) while kickoff
   * was still open, close kickoff so Sounds good / change can show.
   */
  useEffect(() => {
    if (bookKickoffStage === "done") return;
    if (
      bookKickoffStage !== "before_choice" &&
      bookKickoffStage !== "choice"
    ) {
      return;
    }
    const last = messages.at(-1);
    if (!last || last.role !== "assistant") return;
    if (last.id === BOOK_KICKOFF_CHOICE_MESSAGE_ID) return;
    const c = last.content.toLowerCase();
    if (c.trim().startsWith("[")) return;
    const pitched =
      c.includes("working title") ||
      c.includes("suggest a title") ||
      c.includes("title like") ||
      (c.includes("title") &&
        (c.includes("i suggest") || c.includes("i propose") || c.includes("how about")));
    if (!pitched) return;
    setBookKickoffStage("done");
    usePublishingStore.getState().setIntakeCollaborative(true);
  }, [messages, bookKickoffStage]);

  /** After intake brief is ready (outline gate), ask whether to edit title/subtitle. */
  useEffect(() => {
    if (awaitingGate !== "outline" || !bookSpec) return;
    const key = specTitleKey(bookSpec);
    if (titleConfirmDoneKeyRef.current != null) {
      if (!key || titleConfirmDoneKeyRef.current === key) {
        setTitleConfirmStage((s) => (s === "done" ? s : "done"));
        return;
      }
    }
    setTitleConfirmStage((s) =>
      s === "title" || s === "subtitle" || s === "ask" ? s : "ask",
    );
  }, [awaitingGate, bookSpec]);

  /** Ensure the outline-gate bubble states the title before the edit Yes/No. */
  useEffect(() => {
    if (awaitingGate !== "outline" || titleConfirmStage !== "ask" || !bookSpec) {
      return;
    }
    const pub = usePublishingStore.getState();
    const last = pub.chatMessages.at(-1);
    if (!last || last.role !== "assistant") return;
    if (last.kind !== "gate" && last.kind !== "intake") return;
    const next = formatTitleConfirmAskCopy(bookSpec);
    if (last.content.trim() === next.trim()) return;
    // Only rewrite the generic "working title" gate — not mid-edit prompts.
    const c = last.content.toLowerCase();
    if (
      !c.includes("would you like to check or edit") &&
      !c.includes("including a working title") &&
      !c.includes("here's the working title")
    ) {
      return;
    }
    pub.patchChatMessage(last.id, { content: next });
  }, [awaitingGate, titleConfirmStage, bookSpec]);

  /** Returning signed-in user: empty thread shows kickoff immediately (no YouTube prerequisite). */
  useEffect(() => {
    if (messages.length) return;
    if (bookKickoffStage !== "choice") return;
    if (!isAuthenticated || !listLoaded || conversationCount === 0) return;
    const exists = usePublishingStore.getState().chatMessages.some(
      (m) => m.id === BOOK_KICKOFF_CHOICE_MESSAGE_ID,
    );
    if (exists) return;
    scheduleKickoffAssistantReveal(
      BOOK_KICKOFF_CHOICE_MESSAGE_ID,
      BOOK_KICKOFF_CHOICE_COPY,
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
        newId(),
        "What's the working title for your book?",
        kickoffLoaderTimersRef.current,
      );
      setBookKickoffStage("title");
      return;
    }
    pub.pushUserMessage("No, let's build it together.");
    scheduleKickoffAssistantReveal(
      newId(),
      "What's the book about in a sentence or two?",
      kickoffLoaderTimersRef.current,
    );
    setBookKickoffStage("general_idea");
  };

  async function runCoverImageGeneration() {
    const pub = usePublishingStore.getState();
    const spec = pub.bookSpec;
    const outline = pub.bookOutline;
    const bookId = pub.activeBookId;
    if (!spec || !outline) {
      setCoverErr(
        mapUserError(
          "Book outline or specification is missing. Try regenerating the preview.",
          "cover",
        ),
      );
      return;
    }
    setCoverGenBusy(true);
    setCoverErr(null);
    clearErr();
    setCoverVariantUrls(null);
    try {
      const st = usePublishingStore.getState();
      const intakeName = st.userName?.trim() ?? "";
      const authFirst = useAuthStore.getState().firstName?.trim() ?? "";
      const sessionAuthor = intakeName || authFirst || null;
      const sign = st.coverSigningName?.trim() || null;
      const prompt = buildBookCoverPrompt(spec, outline, sessionAuthor, sign);
      const basename = bookId ? `cover-${bookId.replace(/[^a-zA-Z0-9_-]+/g, "").slice(0, 40)}` : null;
      const res = await generateCoverVariantsForChat(
        prompt,
        basename,
        COVER_VARIANT_COUNT,
      );
      const dataUrls: string[] = [];
      for (let i = 0; i < res.images.length; i++) {
        const b64 = res.images[i]?.image_base64?.trim();
        if (!b64) {
          throw new Error(`Cover option ${i + 1} returned no image data.`);
        }
        dataUrls.push(`data:image/png;base64,${b64}`);
      }
      if (dataUrls.length !== COVER_VARIANT_COUNT) {
        throw new Error(
          `Expected ${COVER_VARIANT_COUNT} cover options, got ${dataUrls.length}.`,
        );
      }
      setCoverVariantUrls(dataUrls);
    } catch (e) {
      setCoverErr(mapUserError(e, "cover"));
    } finally {
      setCoverGenBusy(false);
      setCoverPaymentBlockedOpen(false);
    }
  }

  const applyTitleConfirmEdits = (title: string, subtitle: string) => {
    const pub = usePublishingStore.getState();
    const prevSpec = pub.bookSpec;
    const nextSpec: Record<string, unknown> = {
      ...(prevSpec && typeof prevSpec === "object" ? prevSpec : {}),
      title: title.trim(),
      subtitle: subtitle.trim() || null,
    };
    pub.setIntakeResult(true, nextSpec, null);
    const specMsg = [...pub.chatMessages]
      .reverse()
      .find(
        (m) =>
          m.role === "assistant" &&
          (m.kind === "intake" || m.kind === "gate") &&
          m.bookSpec,
      );
    if (specMsg?.id) {
      pub.patchChatMessage(specMsg.id, { bookSpec: nextSpec });
    }
    titleConfirmDoneKeyRef.current = specTitleKey(nextSpec);
    setTitleConfirmTitle("");
    setTitleConfirmStage("done");
    scheduleKickoffAssistantReveal(
      newId(),
      "Got it — title and subtitle are locked in. You can proceed to the outline when you're ready.",
      kickoffLoaderTimersRef.current,
    );
  };

  const handleTitleConfirmOption = (option: "edit" | "keep") => {
    if (titleConfirmStage !== "ask") return;
    const pub = usePublishingStore.getState();
    if (option === "keep") {
      pub.pushUserMessage("No, keep the title and subtitle.");
      const u = usePublishingStore.getState().chatMessages.at(-1);
      if (u?.role === "user") void persistChatMessageIfAuthenticated(u);
      const key = specTitleKey(pub.bookSpec);
      if (key) {
        titleConfirmDoneKeyRef.current = key;
      } else {
        // No title yet — treat keep as done so they can still proceed.
        titleConfirmDoneKeyRef.current = "::";
      }
      setTitleConfirmStage("done");
      return;
    }
    pub.pushUserMessage("Yes, I'd like to check the title and subtitle.");
    const u = usePublishingStore.getState().chatMessages.at(-1);
    if (u?.role === "user") void persistChatMessageIfAuthenticated(u);
    const currentTitle = String(pub.bookSpec?.title ?? "").trim();
    scheduleKickoffAssistantReveal(
      newId(),
      currentTitle
        ? `What's your preferred title? (Current: "${currentTitle}")`
        : "What's your preferred title for the book?",
      kickoffLoaderTimersRef.current,
    );
    setTitleConfirmStage("title");
  };

  const handleSend = (text: string) => {
    const value = text.trim();
    if (!value) return;
    const pub = usePublishingStore.getState();
    if (
      !isAuthenticated &&
      shouldShowGuestEmailCapture(pub.chatMessages) &&
      value.includes("@")
    ) {
      pub.pushUserMessage(value);
      const u = usePublishingStore.getState().chatMessages.at(-1);
      if (u?.role === "user") void persistChatMessageIfAuthenticated(u);
      pub.setGuestEmail(value);
      const after = usePublishingStore.getState().chatMessages;
      const { userName, guestEmail } = syncGuestOnboardingFromMessages(after);
      if (userName) pub.setUserName(userName);
      if (guestEmail) pub.setGuestEmail(guestEmail);
      // Guests after email: prefer collaborative intake (infer, don't survey format/page size).
      pub.setIntakeCollaborative(true);
      void syncGuestPromotionLead(userName, guestEmail ?? value, false);
      if (
        !after.some((m) => m.id === BOOK_KICKOFF_CHOICE_MESSAGE_ID)
      ) {
        setBookKickoffStage("choice");
        scheduleKickoffAssistantReveal(
          BOOK_KICKOFF_CHOICE_MESSAGE_ID,
          BOOK_KICKOFF_CHOICE_COPY,
          kickoffLoaderTimersRef.current,
        );
      }
      return;
    }
    if (pub.awaitingCoverSigningReply) {
      pub.pushUserMessage(value);
      pub.setCoverSigningName(value);
      pub.setAwaitingCoverSigningReply(false);
      const u = usePublishingStore.getState().chatMessages.at(-1);
      if (u?.role === "user") void persistChatMessageIfAuthenticated(u);
      const ack: ChatMessage = {
        id: newId(),
        role: "assistant",
        kind: "gate",
        content: "Thanks — generating three cover directions now.",
      };
      pub.pushAssistantMessage(ack);
      void persistChatMessageIfAuthenticated(ack);
      void runCoverImageGeneration();
      return;
    }
    if (bookKickoffStage === "title") {
      pub.pushUserMessage(value);
      setBookKickoffTitle(value);
      scheduleKickoffAssistantReveal(
        newId(),
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
        newId(),
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
    if (titleConfirmStage === "title") {
      pub.pushUserMessage(value);
      const u = usePublishingStore.getState().chatMessages.at(-1);
      if (u?.role === "user") void persistChatMessageIfAuthenticated(u);
      setTitleConfirmTitle(value);
      const currentSub = String(
        usePublishingStore.getState().bookSpec?.subtitle ?? "",
      ).trim();
      scheduleKickoffAssistantReveal(
        newId(),
        currentSub
          ? `Nice. What subtitle would you like? (Current: "${currentSub}")`
          : "Nice. What subtitle would you like? You can leave a short tagline, or type a dash (-) to skip.",
        kickoffLoaderTimersRef.current,
      );
      setTitleConfirmStage("subtitle");
      return;
    }
    if (titleConfirmStage === "subtitle") {
      const subtitleRaw = value.trim();
      const subtitle =
        subtitleRaw === "-" || subtitleRaw.toLowerCase() === "skip"
          ? ""
          : subtitleRaw;
      pub.pushUserMessage(value);
      const u = usePublishingStore.getState().chatMessages.at(-1);
      if (u?.role === "user") void persistChatMessageIfAuthenticated(u);
      applyTitleConfirmEdits(titleConfirmTitle, subtitle);
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
  const changeRequirements = () => {
    titleConfirmDoneKeyRef.current = null;
    setTitleConfirmStage("pending");
    setTitleConfirmTitle("");
    usePublishingStore.getState().setAwaitingGate(null);
    usePublishingStore.getState().setComposerStep("intake");
    usePublishingStore.getState().setComposerAction("proceed");
  };
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
    setPayPalGateErr(null);
    const id = usePublishingStore.getState().activeBookId;
    if (!id) {
      setPayPalGateErr(
        mapUserError(
          "We're almost there. Finish the steps until your book is created, then try again.",
          "payment",
        ),
      );
      return;
    }
    const token = getAccessToken();
    if (!token) {
      useAuthDialogRequestStore.getState().requestLogin();
      setPayPalGateErr(
        mapUserError(
          "Please sign in or create an account to pay with PayPal, then tap the button again.",
          "payment",
        ),
      );
      return;
    }
    void (async () => {
      try {
        await persistBookDescriptionToGo(id, token);
      } catch {
        setPayPalGateErr(
          mapUserError(
            "Could not save your book details. Check your connection and try again.",
            "payment",
          ),
        );
        return;
      }
      router.push(`/paypal/checkout?book=${encodeURIComponent(id)}`);
    })();
  };

  const generateFullWithSubscription = async () => {
    setPayPalGateErr(null);
    const id = usePublishingStore.getState().activeBookId;
    if (!id) {
      setPayPalGateErr(
        mapUserError(
          "We're almost there. Finish the steps until your book is created, then try again.",
          "payment",
        ),
      );
      return;
    }
    const token = getAccessToken();
    if (!token) {
      useAuthDialogRequestStore.getState().requestLogin();
      setPayPalGateErr(
        mapUserError("Please sign in to use your subscription credits.", "payment"),
      );
      return;
    }
    setGenerateFullBusy(true);
    try {
      const gate = await checkFullGenerationEntitlement(token);
      if (!gate.ok) {
        setPayPalGateErr(mapUserError(gate.message, "payment"));
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
      try {
        await persistBookDescriptionToGo(id, token);
      } catch {
        setPayPalGateErr(
          mapUserError(
            "Could not save your book details. Check your connection and try again.",
            "payment",
          ),
        );
        return;
      }
      usePublishingStore.getState().setSubscriptionFullGenUnlocked(true);
      usePublishingStore.getState().setAwaitingGate(null);
    } finally {
      setGenerateFullBusy(false);
    }
  };

  const changePreview = () => {
    setCoverVariantUrls(null);
    const p = usePublishingStore.getState();
    p.setPostPayCoverFlowActive(false);
    p.setPostPayFrontMatterLocked(false);
    p.setAwaitingGate(null);
    p.setComposerStep("preview");
    p.setComposerAction("revise");
    p.setCoverSigningName(null);
    p.setAwaitingCoverSigningReply(false);
    p.setFullBookIncludeAboutAuthor(false);
    p.setFullBookIncludeAcknowledgement(false);
    p.setFullBookAboutAuthorText("");
    p.setFullBookAcknowledgementText("");
  };

  const continueToFullBookFromPostPreview = () => {
    setCoverErr(null);
    setCoverVariantUrls(null);
    const p = usePublishingStore.getState();
    const keepBundledFrontMatter =
      p.postPayCoverFlowActive && p.postPayFrontMatterLocked;
    p.setPostPayCoverFlowActive(false);
    if (!keepBundledFrontMatter) {
      p.setPostPayFrontMatterLocked(false);
    }
    p.setCoverSigningName(null);
    p.setAwaitingCoverSigningReply(false);
    p.setAwaitingGate("full");
  };

  const pickCoverVariant = (index: number) => {
    const urls = coverVariantUrls;
    if (!urls || urls.length !== COVER_VARIANT_COUNT) return;
    if (index < 0 || index >= urls.length) return;
    const chosen = urls[index];
    if (!chosen) return;
    const bookId = usePublishingStore.getState().activeBookId?.trim();
    if (!bookId) {
      setCoverErr(
        mapUserError(
          "No book is linked to this chat, so your chosen cover cannot be saved on the book for the PDF. Continue from your book or restore the preview flow, then pick a cover again.",
          "cover",
        ),
      );
      return;
    }
    setCoverVariantUrls(null);
    const pub = usePublishingStore.getState();
    pub.setPostPayCoverFlowActive(false);
    const msg: ChatMessage = {
      id: newId(),
      role: "assistant",
      kind: "cover",
      content: `Here's your book cover (option ${index + 1} of ${COVER_VARIANT_COUNT}).`,
      coverImageDataUrl: chosen,
      coverVariantIndex: index + 1,
    };
    pub.pushAssistantMessage(msg);
    pub.setAwaitingGate("full");
    void (async () => {
      const saved = await persistChatMessageIfAuthenticated(msg);
      if (!saved) {
        setCoverErr(
          mapUserError(
            "We couldn’t save your cover to the server. Check your connection, ensure you’re signed in with a synced chat, then pick a cover again — otherwise the PDF may not include it.",
            "cover",
          ),
        );
      }
    })();
  };

  const payForCoverPage = () => {
    clearErr();
    setCoverErr(null);
    setPayPalGateErr(null);
    if (!getAccessToken()) {
      useAuthDialogRequestStore.getState().requestLogin();
      setPayPalGateErr(
        mapUserError("Please sign in to purchase a cover, then try again.", "payment"),
      );
      return;
    }
    const pub = usePublishingStore.getState();
    if (!pub.bookSpec || !pub.bookOutline) {
      setCoverErr(
        mapUserError(
          "Book details are missing. Regenerate the preview, then try again.",
          "cover",
        ),
      );
      return;
    }
    if (!pub.postPayCoverFlowActive && !COVER_PAYMENT_BYPASS) {
      setCoverPaymentBlockedOpen(true);
      return;
    }
    if (!pub.coverSigningName?.trim()) {
      if (!pub.awaitingCoverSigningReply) {
        const ask: ChatMessage = {
          id: newId(),
          role: "assistant",
          kind: "gate",
          content:
            "How do you want to sign your book? Type the name exactly as it should appear on the bottom of the cover, then press Send.",
        };
        pub.pushAssistantMessage(ask);
        pub.setAwaitingCoverSigningReply(true);
        void persistChatMessageIfAuthenticated(ask);
      }
      return;
    }
    void runCoverImageGeneration();
  };

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

  const threadError = useMemo(() => {
    if (coverErr) {
      return {
        message: coverErr.message,
        retryable: coverErr.retryable,
        tone: coverErr.tone,
        onRetry: coverErr.retryable
          ? () => {
              void runCoverImageGeneration();
            }
          : undefined,
      };
    }
    if (err) {
      return {
        message: err.message,
        retryable: err.retryable,
        tone: err.tone,
        onRetry: err.retryable ? () => void retry() : undefined,
      };
    }
    return null;
  }, [coverErr, err, retry]);

  const clearPaymentErrors = useCallback(() => {
    setPayPalGateErr(null);
  }, []);
  const paymentGateError = payPalGateErr;
  const paymentGateRetry = payPalGateErr
    ? () => void generateFullWithSubscription()
    : undefined;

  return (
    <>
      <Dialog
        open={coverPaymentBlockedOpen}
        onOpenChange={(open) => {
          setCoverPaymentBlockedOpen(open);
        }}
      >
        <DialogContent className="border-border dark:border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cover generation</DialogTitle>
            <DialogDescription className="text-left text-sm leading-relaxed text-foreground dark:text-zinc-200">
              AI cover is purchased with your full book on the PayPal checkout page. This dialog
              only appears for legacy paths. To test cover generation locally without that flow,
              set{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                NEXT_PUBLIC_COVER_PAYMENT_BYPASS=true
              </code>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setCoverPaymentBlockedOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
      <ChatShell
        showConversationChrome={showConversationChrome}
        showGeneratedOutlineButton={Boolean(bookOutline)}
        onOpenGeneratedOutline={() => setOutlineMobileOpen(true)}
        onSidebarWillOpen={() => setOutlineMobileOpen(false)}
      >
        <ChatWorkspace
          hasThread={hasThread}
          threadError={threadError}
          busy={busy}
          messages={messages}
          bookOutline={bookOutline}
          awaitingGate={awaitingGate}
          isAuthenticated={isAuthenticated}
          outlineMobileOpen={outlineMobileOpen}
          onCloseOutlineMobile={() => setOutlineMobileOpen(false)}
          onSend={handleSend}
          clearThreadError={() => {
            clearErr();
            setCoverErr(null);
          }}
          proceedToOutline={proceedToOutline}
          changeRequirements={changeRequirements}
          proceedToPreview={proceedToPreview}
          changeOutline={changeOutline}
          payForCoverPage={payForCoverPage}
          continueToFullBookFromPostPreview={continueToFullBookFromPostPreview}
          coverGenBusy={coverGenBusy}
          coverVariantUrls={coverVariantUrls}
          onPickCoverVariant={pickCoverVariant}
          payForFullBook={payForFullBook}
          generateFullWithSubscription={() => void generateFullWithSubscription()}
          fullBookGateMode={fullBookGateMode}
          generateFullBusy={generateFullBusy}
          changePreview={changePreview}
          payPalLoading={false}
          payPalError={paymentGateError}
          onRetryPayment={paymentGateRetry}
          onDismissPayment={clearPaymentErrors}
          bookKickoffStage={bookKickoffStage}
          onBookKickoffOptionSelect={handleBookKickoffOption}
          onBookKickoffInputSend={handleSend}
          titleConfirmStage={titleConfirmStage}
          onTitleConfirmOptionSelect={handleTitleConfirmOption}
          onTitleConfirmInputSend={handleSend}
          onCollaborativeAgree={handleCollaborativeAgree}
          onCollaborativeQuickChange={handleCollaborativeQuickChange}
          onCollaborativeChangeSend={handleCollaborativeChangeSend}
          onRetryFullBook={retryFullBook}
        />
      </ChatShell>
    </>
  );
}
