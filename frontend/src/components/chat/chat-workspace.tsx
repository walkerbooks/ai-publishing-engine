"use client";

import type { ChatMessage } from "@/lib/types/chat";
import { ChatHero } from "@/components/chat/chat-hero";
import { ChatThread } from "@/components/chat/chat-thread";
import { ChatComposer } from "@/components/chat/chat-composer";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatGatePanel } from "@/components/chat/chat-gate-panel";
import { ChatOutlineSidecard } from "@/components/chat/chat-outline-sidecard";
import { cn } from "@/lib/utils/cn";

type GateHandlers = {
  proceedToOutline: () => void;
  changeRequirements: () => void;
  proceedToPreview: () => void;
  changeOutline: () => void;
  unlockFull: () => void;
  changePreview: () => void;
};

type Props = {
  hasThread: boolean;
  err: string | null;
  busy: boolean;
  messages: ChatMessage[];
  bookOutline: Record<string, unknown> | null;
  awaitingGate: null | "outline" | "preview" | "full";
  onWelcomePick: (opt: string) => void;
  onSend: (text: string) => void;
  clearErr: () => void;
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
  onWelcomePick,
  onSend,
  clearErr,
  proceedToOutline,
  changeRequirements,
  proceedToPreview,
  changeOutline,
  unlockFull,
  changePreview,
}: Props) {
  const showOutlineColumn = Boolean(bookOutline);

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
              onQuickPick={onWelcomePick}
            />
            {busy ? (
              <div className="mt-8 w-full max-w-2xl space-y-2">
                <Skeleton className="mx-auto h-4 w-2/3 bg-zinc-700/60" />
                <Skeleton className="mx-auto h-4 w-1/2 bg-zinc-700/60" />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
          {/* Row 1: messages + outline — bounded height so inner panes scroll */}
          <div className="min-h-0 min-w-0 overflow-hidden">
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden lg:flex-row lg:items-stretch">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 pt-2 sm:px-4 sm:pt-3">
                <p className="mb-2 shrink-0 text-xs font-medium uppercase tracking-wider text-zinc-600">
                  Smith Book · Intake → outline → preview
                </p>
                <div className="mb-2 shrink-0 lg:hidden">
                  <ChatOutlineSidecard
                    outline={bookOutline}
                    variant="embedded"
                  />
                </div>
                <div
                  className="chat-pane-scroll min-h-0 min-w-0 flex-1"
                  aria-label="Chat messages"
                >
                  <ChatThread messages={messages} variant="dark" />
                  {busy ? (
                    <div className="mt-3 space-y-2 pb-4">
                      <Skeleton className="h-4 w-2/3 bg-zinc-700/60" />
                      <Skeleton className="h-4 w-1/2 bg-zinc-700/60" />
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                className={cn(
                  "hidden min-h-0 shrink-0 flex-col border-white/10 lg:flex",
                  showOutlineColumn
                    ? "w-[300px] border-l bg-[#0d0d0d]/80 xl:w-[320px]"
                    : "w-0 overflow-hidden border-0",
                )}
              >
                {showOutlineColumn ? (
                  <div
                    className="chat-pane-scroll flex h-full min-h-0 min-w-0 flex-1 flex-col py-3 pl-3 pr-2 xl:pl-4"
                    role="region"
                    aria-label="Generated outline"
                  >
                    <ChatOutlineSidecard
                      outline={bookOutline}
                      variant="sidebar"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Row 2: composer — grid auto row, always under thread */}
          <div className="chat-dock-enter shrink-0 border-t border-white/10 bg-[#0d0d0d]/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-4 sm:py-4">
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
