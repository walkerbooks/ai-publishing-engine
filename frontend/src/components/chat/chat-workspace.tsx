"use client";

import { useTheme } from "next-themes";
import { useRef } from "react";
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

type GateHandlers = {
  proceedToOutline: () => void;
  changeRequirements: () => void;
  proceedToPreview: () => void;
  changeOutline: () => void;
  unlockFull: () => void;
  changePreview: () => void;
  payPalLoading?: boolean;
  payPalError?: string | null;
};

type Props = {
  hasThread: boolean;
  err: string | null;
  busy: boolean;
  messages: ChatMessage[];
  bookOutline: Record<string, unknown> | null;
  awaitingGate: null | "outline" | "preview" | "full";
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
  onSend,
  clearErr,
  proceedToOutline,
  changeRequirements,
  proceedToPreview,
  changeOutline,
  unlockFull,
  changePreview,
  payPalLoading,
  payPalError,
  outlineMobileOpen = false,
  onCloseOutlineMobile,
}: Props) {
  const showOutlineColumn = Boolean(bookOutline);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const msgVariant = resolvedTheme === "light" ? "light" : "dark";
  useChatScroll(messages, threadScrollRef);

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
      {err ? (
        <div
          className="shrink-0 border-b border-red-500/20 bg-red-950/40 px-4 py-2 text-center text-sm text-red-300"
          role="alert"
        >
          {err}
        </div>
      ) : null}

      {!hasThread ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
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
        <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
          {/* Row 1: desktop outline is absolute inset-y-0 so height = grid row, not outline content min-height */}
          <div className="relative min-h-0 min-w-0 overflow-hidden">
            <div
              className={cn(
                "flex h-full min-h-0 min-w-0 flex-col overflow-hidden px-3 pt-2 sm:px-4 sm:pt-3",
                showOutlineColumn && "lg:mr-[300px] xl:mr-[320px]",
              )}
            >
              <p className="mb-2 shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Smith Book · Intake → outline → preview
              </p>
              {/* relative + absolute inset-0: guarantees a fixed-height clip so overflow-y scrolls inside nested flex/grid */}
              <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
                <div
                  ref={threadScrollRef}
                  className="chat-pane-scroll absolute inset-0 min-h-0 min-w-0 overflow-y-auto"
                  aria-label="Chat messages"
                >
                  <ChatThread messages={messages} variant={msgVariant} />
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
                className="absolute inset-y-0 right-0 z-10 hidden w-[300px] flex-col overflow-hidden border-l border-border bg-slate-100 dark:border-white/10 dark:bg-[#0d0d0d] lg:flex xl:w-[320px]"
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

          {/* Row 2: composer — grid auto row, always under thread */}
          <div className="chat-dock-enter shrink-0 border-t border-slate-200/90 bg-background/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:border-white/10 dark:bg-[#0d0d0d]/95 sm:px-4 sm:py-4">
            <div
              className={cn(
                "mx-auto w-full max-w-3xl",
                showOutlineColumn && "lg:max-w-none xl:max-w-4xl",
              )}
            >
              {awaitingGate ? (
                <ChatGatePanel
                  awaitingGate={awaitingGate}
                  onProceedToOutline={proceedToOutline}
                  onChangeRequirements={changeRequirements}
                  onProceedToPreview={proceedToPreview}
                  onChangeOutline={changeOutline}
                  onUnlockFull={unlockFull}
                  onChangePreview={changePreview}
                  payPalLoading={payPalLoading}
                  payPalError={payPalError}
                />
              ) : (
                <ChatComposer
                  disabled={busy}
                  onSend={(t) => (clearErr(), onSend(t))}
                  variant="dock"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
