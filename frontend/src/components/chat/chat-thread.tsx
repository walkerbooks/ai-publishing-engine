"use client";

import type { ChatMessage } from "@/lib/types/chat";
import { ChatMessageRow } from "@/components/chat/chat-message-row";
import { useChatScroll } from "@/hooks/use-chat-scroll";
type Props = {
  messages: ChatMessage[];
  variant?: "light" | "dark";
};

/**
 * Message list only — parent supplies `overflow-y-auto` + `min-h-0` for scroll (see ChatWorkspace).
 */
export function ChatThread({ messages, variant = "light" }: Props) {
  const endRef = useChatScroll(messages);
  return (
    <div className="w-full min-w-0 pr-1">
      {messages.map((m) => (
        <ChatMessageRow key={m.id} message={m} variant={variant} />
      ))}
      <div ref={endRef} className="h-2 shrink-0" />
    </div>
  );
}
