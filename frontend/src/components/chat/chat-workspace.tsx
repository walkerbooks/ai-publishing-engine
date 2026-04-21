"use client";

import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types/chat";
import { ChatHero } from "@/components/chat/chat-hero";
import { ChatThread } from "@/components/chat/chat-thread";
import { ChatComposer } from "@/components/chat/chat-composer";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatGatePanel } from "@/components/chat/chat-gate-panel";
import { ChatOutlineSidecard } from "@/components/chat/chat-outline-sidecard";
import { ChatOutlineDrawer } from "@/components/chat/shell/chat-outline-drawer";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { cn } from "@/lib/utils/cn";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { usePublishingStore } from "@/stores/publishing-store";
import { shouldDisableDockComposerForGuestInlineCapture } from "@/lib/chat/welcome-flow";
import { shouldShowCollaborativeFeedback } from "@/lib/chat/collaborative-feedback";
import { threadPastBookKickoff } from "@/lib/chat/book-kickoff";
import { isTerminalFullBookPdfComplete } from "@/lib/chat/terminal-full-book";

type GateHandlers = {
  proceedToOutline: () => void;
  changeRequirements: () => void;
  proceedToPreview: () => void;
  changeOutline: () => void;
  payForCoverPage: () => void;
  continueToFullBookFromPostPreview: () => void;
  coverGenBusy?: boolean;
  coverVariantUrls?: string[] | null;
  onPickCoverVariant?: (index: number) => void;
  payForFullBook: () => void;
  generateFullWithSubscription: () => void;
  changePreview: () => void;
  fullBookGateMode?: "loading" | "generate" | "cooldown" | "paypal";
  generateFullBusy?: boolean;
  payPalLoading?: boolean;
  payPalError?: string | null;
  bookKickoffStage?: "choice" | "title" | "subtitle" | "summary" | "general_idea" | "done";
  onBookKickoffOptionSelect?: (option: "start_together" | "complete_idea") => void;
  onBookKickoffInputSend?: (text: string) => void;
  onCollaborativeAgree?: () => void;
  onCollaborativeQuickChange?: (message: string) => void;
  onCollaborativeChangeSend?: (text: string) => void;
};

type Props = {
  hasThread: boolean;
  err: string | null;
  busy: boolean;
  messages: ChatMessage[];
  bookOutline: Record<string, unknown> | null;
  awaitingGate: null | "outline" | "preview" | "post_preview" | "full";
  isAuthenticated: boolean;
  onSend: (text: string) => void;
  clearErr: () => void;
  /** Mobile: controlled slide-over outline panel */
  outlineMobileOpen?: boolean;
  onCloseOutlineMobile?: () => void;
} & GateHandlers;

/**
 * Active chat: CSS Grid row 1 = scrollable thread + outline; row 2 = dock (always bottom).
 */
export function ChatWorkspace({
  hasThread,
  err,
  busy,
  messages,
  bookOutline,
  awaitingGate,
  isAuthenticated,
  onSend,
  clearErr,
  proceedToOutline,
  changeRequirements,
  proceedToPreview,
  changeOutline,
  payForCoverPage,
  continueToFullBookFromPostPreview,
  coverGenBusy,
  coverVariantUrls,
  onPickCoverVariant,
  payForFullBook,
  generateFullWithSubscription,
  changePreview,
  fullBookGateMode,
  generateFullBusy,
  payPalLoading,
  payPalError,
  outlineMobileOpen = false,
  onCloseOutlineMobile,
  bookKickoffStage,
  onBookKickoffOptionSelect,
  onBookKickoffInputSend,
  onCollaborativeAgree,
  onCollaborativeQuickChange,
  onCollaborativeChangeSend,
}: Props) {
  const showOutlineColumn = Boolean(bookOutline);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const msgVariant = resolvedTheme === "light" ? "light" : "dark";
  useChatScroll(messages, threadScrollRef);
  const guestGateMessage = useChatDirectoryStore((s) => s.guestGateMessage);
  const clearGuestGateMessage = useChatDirectoryStore((s) => s.clearGuestGateMessage);

  const intakeCollaborative = usePublishingStore((s) => s.intakeCollaborative);
  const intakeComplete = usePublishingStore((s) => s.intakeComplete);
  const composerStep = usePublishingStore((s) => s.composerStep);
  const previewContent = usePublishingStore((s) => s.previewContent);
  const awaitingCoverSigningReply = usePublishingStore((s) => s.awaitingCoverSigningReply);
  const [collaborativeChangeOpen, setCollaborativeChangeOpen] = useState(false);

  const terminalFullBookPdfDone = useMemo(
    () => isTerminalFullBookPdfComplete(messages),
    [messages],
  );

  const hideBookKickoffForProgress = useMemo(
    () =>
      threadPastBookKickoff({
        awaitingGate,
        bookOutline,
        previewContent,
        composerStep,
        messages,
      }),
    [awaitingGate, bookOutline, previewContent, composerStep, messages],
  );

  const showCollaborativeFeedback = useMemo(
    () =>
      shouldShowCollaborativeFeedback(messages, {
        intakeCollaborative,
        intakeComplete,
        busy,
        awaitingGate,
        composerStep,
        bookKickoffStage: bookKickoffStage ?? "done",
        isAuthenticated,
      }) && !terminalFullBookPdfDone,
    [
      messages,
      terminalFullBookPdfDone,
      intakeCollaborative,
      intakeComplete,
      busy,
      awaitingGate,
      composerStep,
      bookKickoffStage,
      isAuthenticated,
    ],
  );

  useEffect(() => {
    if (!showCollaborativeFeedback) setCollaborativeChangeOpen(false);
  }, [showCollaborativeFeedback]);

  const guestInlineCaptureBlocksDock = useMemo(
    () => shouldDisableDockComposerForGuestInlineCapture(messages, isAuthenticated),
    [messages, isAuthenticated],
  );
  /** Same `[adding spice...]`-style placeholders as unified stream; hide kickoff UI until revealed. */
  const assistantKickoffLoader =
    messages.at(-1)?.role === "assistant" &&
    messages.at(-1)!.content.trim().startsWith("[");
  const showBookKickoffChoices =
    !terminalFullBookPdfDone &&
    !hideBookKickoffForProgress &&
    bookKickoffStage === "choice" &&
    messages.at(-1)?.role === "assistant" &&
    !assistantKickoffLoader;
  const showBookKickoffInput =
    !terminalFullBookPdfDone &&
    !hideBookKickoffForProgress &&
    (bookKickoffStage === "title" ||
      bookKickoffStage === "subtitle" ||
      bookKickoffStage === "summary" ||
      bookKickoffStage === "general_idea") &&
    messages.at(-1)?.role === "assistant" &&
    !assistantKickoffLoader;

  const bookKickoffInputPlaceholder = useMemo(() => {
    switch (bookKickoffStage) {
      case "title":
        return "Type your title...";
      case "subtitle":
        return "Type your subtitle...";
      case "summary":
        return "Give a 2-3 sentence summary...";
      case "general_idea":
        return "Share your idea in a sentence or two...";
      default:
        return "Type your answer...";
    }
  }, [bookKickoffStage]);

  const bookKickoffInputAriaLabel = useMemo(() => {
    switch (bookKickoffStage) {
      case "title":
        return "Working title";
      case "subtitle":
        return "Subtitle";
      case "summary":
        return "Book summary";
      case "general_idea":
        return "Your book idea";
      default:
        return "Your answer";
    }
  }, [bookKickoffStage]);

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
      {guestGateMessage ? (
        <div
          className="flex shrink-0 items-start justify-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-sm text-amber-950 dark:text-amber-50"
          role="status"
        >
          <span className="min-w-0 flex-1 text-balance">{guestGateMessage}</span>
          <button
            type="button"
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-amber-900 underline-offset-2 hover:underline dark:text-amber-100"
            onClick={() => clearGuestGateMessage()}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {err ? (
        <div
          className="shrink-0 border-b border-red-500/20 bg-red-950/40 px-4 py-2 text-center text-sm text-red-300"
          role="alert"
        >
          {err}
        </div>
      ) : null}

      {!hasThread ? (
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden",
            "bg-transparent",
            "dark:bg-[linear-gradient(135deg,#0D1B2A_0%,#112236_55%,#0D4A3A_100%)]",
          )}
        >
          <div className="flex min-h-full min-w-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
            <ChatHero
              disabled={busy}
              onSend={(t) => (clearErr(), onSend(t))}
            />
            {busy ? (
              <div className="mt-8 w-full max-w-2xl space-y-2">
                <Skeleton className="mx-auto h-4 w-2/3" />
                <Skeleton className="mx-auto h-4 w-1/2" />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "grid min-h-0 min-w-0 flex-1 overflow-hidden",
            terminalFullBookPdfDone
              ? "grid-rows-[minmax(0,1fr)]"
              : "grid-rows-[minmax(0,1fr)_auto]",
          )}
        >
          {/* Row 1: desktop outline is absolute inset-y-0 so height = grid row, not outline content min-height */}
          <div className="relative min-h-0 min-w-0 overflow-hidden">
            <div
              className={cn(
                "flex h-full min-h-0 min-w-0 flex-col overflow-hidden px-3 pt-2 sm:px-4 sm:pt-3",
                showOutlineColumn && "lg:mr-[300px] xl:mr-[320px]",
              )}
            >
              {/* relative + absolute inset-0: guarantees a fixed-height clip so overflow-y scrolls inside nested flex/grid */}
              <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
                <div
                  ref={threadScrollRef}
                  className="chat-pane-scroll absolute inset-0 min-h-0 min-w-0 overflow-y-auto"
                  aria-label="Chat messages"
                >
                  <ChatThread
                    messages={messages}
                    variant={msgVariant}
                    isAuthenticated={isAuthenticated}
                    busy={busy}
                    onGuestNameSend={(t) => (clearErr(), onSend(t))}
                    onGuestEmailSend={(t) => (clearErr(), onSend(t))}
                    showBookKickoffChoices={showBookKickoffChoices}
                    onBookKickoffOptionSelect={onBookKickoffOptionSelect}
                    showBookKickoffInput={showBookKickoffInput}
                    onBookKickoffInputSend={onBookKickoffInputSend}
                    bookKickoffInputPlaceholder={bookKickoffInputPlaceholder}
                    bookKickoffInputAriaLabel={bookKickoffInputAriaLabel}
                    showCollaborativeFeedback={showCollaborativeFeedback}
                    collaborativeChangeMode={collaborativeChangeOpen}
                    onCollaborativeAgree={() => {
                      setCollaborativeChangeOpen(false);
                      onCollaborativeAgree?.();
                    }}
                    onCollaborativeChooseChange={() => setCollaborativeChangeOpen(true)}
                    onCollaborativeChangeBack={() => setCollaborativeChangeOpen(false)}
                    onCollaborativeQuickChange={(msg) => {
                      setCollaborativeChangeOpen(false);
                      onCollaborativeQuickChange?.(msg);
                    }}
                    onCollaborativeChangeSend={(text) => {
                      setCollaborativeChangeOpen(false);
                      onCollaborativeChangeSend?.(text);
                    }}
                  />
                  {busy ? (
                    <div className="mt-3 space-y-2 pb-4">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {showOutlineColumn ? (
              <div
                className="absolute inset-y-0 right-0 z-10 hidden w-[300px] flex-col overflow-hidden border-l border-border bg-white/45 backdrop-blur-xl dark:border-white/10 dark:bg-walker-hero-night dark:backdrop-blur-none lg:flex xl:w-[320px]"
                role="region"
                aria-label="Generated outline"
              >
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden py-3 pl-3 pr-2 xl:pl-4">
                  <ChatOutlineSidecard
                    outline={bookOutline}
                    variant="sidebar"
                  />
                </div>
              </div>
            ) : null}

            {showOutlineColumn && onCloseOutlineMobile ? (
              <ChatOutlineDrawer
                open={outlineMobileOpen}
                onClose={onCloseOutlineMobile}
                outline={bookOutline}
              />
            ) : null}
          </div>

          {/* Row 2: composer — hidden when the thread ends on a delivered PDF */}
          {!terminalFullBookPdfDone ? (
            <div className="chat-dock-enter shrink-0 border-t border-slate-200/90 bg-background/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-white/10 dark:bg-walker-night sm:px-4 sm:py-4">
              <div
                className={cn(
                  "mx-auto w-full max-w-3xl",
                  showOutlineColumn && "lg:max-w-none xl:max-w-4xl",
                )}
              >
                {awaitingGate ? (
                  <div className="space-y-3">
                    <ChatGatePanel
                      awaitingGate={awaitingGate}
                      onProceedToOutline={proceedToOutline}
                      onChangeRequirements={changeRequirements}
                      onProceedToPreview={proceedToPreview}
                      onChangeOutline={changeOutline}
                      onPayForCoverPage={payForCoverPage}
                      onContinueToFullBookFromPostPreview={
                        continueToFullBookFromPostPreview
                      }
                      coverGenBusy={coverGenBusy}
                      coverVariantUrls={coverVariantUrls}
                      onPickCoverVariant={onPickCoverVariant}
                      onPayForFullBook={payForFullBook}
                      onGenerateFullWithSubscription={generateFullWithSubscription}
                      onChangePreview={changePreview}
                      fullBookGateMode={fullBookGateMode}
                      payPalLoading={payPalLoading}
                      generateFullBusy={generateFullBusy}
                      payPalError={payPalError}
                      awaitingCoverSigningReply={awaitingCoverSigningReply}
                    />
                    {awaitingGate === "post_preview" && awaitingCoverSigningReply ? (
                      <ChatComposer
                        disabled={
                          busy ||
                          guestInlineCaptureBlocksDock ||
                          showBookKickoffChoices ||
                          showBookKickoffInput ||
                          showCollaborativeFeedback ||
                          assistantKickoffLoader
                        }
                        onSend={(t) => (clearErr(), onSend(t))}
                        variant="dock"
                      />
                    ) : null}
                  </div>
                ) : (
                  <ChatComposer
                    disabled={
                      busy ||
                      guestInlineCaptureBlocksDock ||
                      showBookKickoffChoices ||
                      showBookKickoffInput ||
                      showCollaborativeFeedback ||
                      assistantKickoffLoader
                    }
                    onSend={(t) => (clearErr(), onSend(t))}
                    variant="dock"
                  />
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
