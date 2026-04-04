"use client";

import type { ChatMessage } from "@/lib/types/chat";
import { ChatMessageRow } from "@/components/chat/chat-message-row";
import { GuestNameInlineField } from "@/components/chat/guest-name-inline-field";
import {
  isGuestNameCaptureTurn,
  isWelcomeVideosSettledForMessage,
  shouldShowGuestEmailCapture,
} from "@/lib/chat/welcome-flow";

const GUEST_EMAIL_BRIDGE_WITH_VIDEOS =
  "Creators share all kinds of strategies in those videos. When you're ready for manuscript updates and to receive your finished book from Smith Book, add the email you'd like us to use below—we'll only contact you about your book.";

const GUEST_EMAIL_BRIDGE_NO_VIDEOS =
  "When you're ready for manuscript updates and to receive your finished book from Smith Book, add the email you'd like us to use below—we'll only contact you about your book.";

type Props = {
  messages: ChatMessage[];
  variant?: "light" | "dark";
  /** When false and the assistant asks for a name, an inline field is shown below that message. */
  isAuthenticated?: boolean;
  busy?: boolean;
  onGuestNameSend?: (text: string) => void;
  onGuestEmailSend?: (text: string) => void;
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
                    placeholder="type your email..."
                    autoComplete="email"
                    ariaLabel="Type your email"
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
          </div>
        );
      })}
    </div>
  );
}
