"use client";

import type { ChatMessage } from "@/lib/types/chat";
import { ChatMessageRow } from "@/components/chat/chat-message-row";
import { GuestNameInlineField } from "@/components/chat/guest-name-inline-field";
import {
  isGuestNameCaptureTurn,
  isWelcomeVideosSettledForMessage,
  shouldShowGuestEmailCapture,
} from "@/lib/chat/welcome-flow";
import { COLLAB_CHANGE_QUICK_OPTIONS } from "@/lib/chat/collaborative-feedback";

const GUEST_EMAIL_BRIDGE_WITH_VIDEOS =
  "Creators share all kinds of strategies in those videos. When you're ready for manuscript updates and to receive your finished book from WalkerBook, add the email you'd like us to use below—we'll only contact you about your book.";

const GUEST_EMAIL_BRIDGE_NO_VIDEOS =
  "When you're ready for manuscript updates and to receive your finished book from WalkerBook, add the email you'd like us to use below—we'll only contact you about your book.";

type Props = {
  messages: ChatMessage[];
  variant?: "light" | "dark";
  /** When false and the assistant asks for a name, an inline field is shown below that message. */
  isAuthenticated?: boolean;
  busy?: boolean;
  onGuestNameSend?: (text: string) => void;
  onGuestEmailSend?: (text: string) => void;
  showBookKickoffChoices?: boolean;
  onBookKickoffOptionSelect?: (option: "start_together" | "complete_idea") => void;
  showBookKickoffInput?: boolean;
  onBookKickoffInputSend?: (text: string) => void;
  /** Shown below kickoff inline input when `showBookKickoffInput` is true. */
  bookKickoffInputPlaceholder?: string;
  bookKickoffInputAriaLabel?: string;
  /** Collaborative intake: agree / change + optional inline change field */
  showCollaborativeFeedback?: boolean;
  collaborativeChangeMode?: boolean;
  onCollaborativeAgree?: () => void;
  onCollaborativeChooseChange?: () => void;
  onCollaborativeChangeBack?: () => void;
  onCollaborativeQuickChange?: (message: string) => void;
  onCollaborativeChangeSend?: (text: string) => void;
};

/**
 * Message list only — parent supplies a bounded scroll container (see ChatWorkspace).
 */
export function ChatThread({
  messages,
  variant = "light",
  isAuthenticated = true,
  busy = false,
  onGuestNameSend,
  onGuestEmailSend,
  showBookKickoffChoices = false,
  onBookKickoffOptionSelect,
  showBookKickoffInput = false,
  onBookKickoffInputSend,
  bookKickoffInputPlaceholder = "Type your answer...",
  bookKickoffInputAriaLabel = "Your answer",
  showCollaborativeFeedback = false,
  collaborativeChangeMode = false,
  onCollaborativeAgree,
  onCollaborativeChooseChange,
  onCollaborativeChangeBack,
  onCollaborativeQuickChange,
  onCollaborativeChangeSend,
}: Props) {
  const lastIdx = messages.length - 1;
  const guestEmailStep = shouldShowGuestEmailCapture(messages);

  return (
    <div className="w-full min-w-0 pr-1 pb-2">
      {messages.map((m, i) => {
        const kind = m.kind ?? "intake";
        const showGuestNameField =
          !isAuthenticated &&
          Boolean(onGuestNameSend) &&
          !busy &&
          i === lastIdx &&
          m.role === "assistant" &&
          (kind === "intake" || !m.kind) &&
          isGuestNameCaptureTurn(messages, i);

        const videosSettled = isWelcomeVideosSettledForMessage(m);
        const showGuestEmailField =
          !isAuthenticated &&
          Boolean(onGuestEmailSend) &&
          !busy &&
          guestEmailStep &&
          videosSettled &&
          i === lastIdx &&
          m.role === "assistant" &&
          (kind === "intake" || !m.kind);

        const guestEmailBridgeText =
          showGuestEmailField && m.videos?.length
            ? GUEST_EMAIL_BRIDGE_WITH_VIDEOS
            : showGuestEmailField
              ? GUEST_EMAIL_BRIDGE_NO_VIDEOS
              : undefined;

        return (
          <div key={m.id} className="mb-4">
            <ChatMessageRow
              message={m}
              variant={variant}
              className="!mb-0"
              afterVideosBridgeText={guestEmailBridgeText}
            />
            {showGuestEmailField ? (
              <div className="mt-2 flex justify-end">
                <div className="w-full max-w-[min(100%,36rem)]">
                  <GuestNameInlineField
                    variant={variant}
                    disabled={busy}
                    onSend={onGuestEmailSend!}
                    placeholder="Your email address..."
                    autoComplete="email"
                    ariaLabel="Your email address"
                    submitAriaLabel="Send email"
                    inputType="email"
                  />
                </div>
              </div>
            ) : null}
            {showGuestNameField ? (
              <div className="mt-2 flex justify-end">
                <div className="w-full max-w-[min(100%,36rem)]">
                  <GuestNameInlineField
                    variant={variant}
                    disabled={busy}
                    onSend={onGuestNameSend!}
                  />
                </div>
              </div>
            ) : null}
            {showBookKickoffChoices && i === lastIdx ? (
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-[#1e3a5f] px-3 py-2 text-sm text-white shadow transition hover:bg-[#274b79] dark:bg-zinc-700 dark:hover:bg-zinc-600"
                  onClick={() => onBookKickoffOptionSelect?.("start_together")}
                >
                  No, let's build it together
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-[#1e3a5f] px-3 py-2 text-sm text-white shadow transition hover:bg-[#274b79] dark:bg-zinc-700 dark:hover:bg-zinc-600"
                  onClick={() => onBookKickoffOptionSelect?.("complete_idea")}
                >
                  I have a full concept ready
                </button>
              </div>
            ) : null}
            {showBookKickoffInput && i === lastIdx ? (
              <div className="mt-2 flex justify-end">
                <div className="w-full max-w-[min(100%,36rem)]">
                  <GuestNameInlineField
                    variant={variant}
                    disabled={busy}
                    onSend={onBookKickoffInputSend!}
                    placeholder={bookKickoffInputPlaceholder}
                    autoComplete="off"
                    ariaLabel={bookKickoffInputAriaLabel}
                    submitAriaLabel="Send response"
                    inputType="text"
                  />
                </div>
              </div>
            ) : null}
            {showCollaborativeFeedback && i === lastIdx ? (
              <div className="mt-2 flex w-full max-w-[min(100%,36rem)] flex-col gap-2 self-end">
                {!collaborativeChangeMode ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-xl bg-[#1e3a5f] px-3 py-2 text-sm text-white shadow transition hover:bg-[#274b79] dark:bg-zinc-700 dark:hover:bg-zinc-600"
                      onClick={() => onCollaborativeAgree?.()}
                    >
                      Sounds good — continue
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                      onClick={() => onCollaborativeChooseChange?.()}
                    >
                      I want to change something
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline dark:text-zinc-400"
                        onClick={() => onCollaborativeChangeBack?.()}
                      >
                        Back
                      </button>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {COLLAB_CHANGE_QUICK_OPTIONS.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                          onClick={() => onCollaborativeQuickChange?.(opt.message)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <div className="w-full max-w-[min(100%,36rem)]">
                        <GuestNameInlineField
                          variant={variant}
                          disabled={busy}
                          onSend={(t) => onCollaborativeChangeSend?.(t)}
                          placeholder="Or describe what you'd like different..."
                          autoComplete="off"
                          ariaLabel="What to change"
                          submitAriaLabel="Send change"
                          inputType="text"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
