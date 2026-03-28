"use client";

import type { ChatMessage } from "@/lib/types/chat";
import { ChatMessageRow } from "@/components/chat/chat-message-row";

type Props = {
  messages: ChatMessage[];
  variant?: "light" | "dark";
};

/**
 * Message list only — parent supplies a bounded scroll container (see ChatWorkspace).
 */
export function ChatThread({ messages, variant = "light" }: Props) {
  return (
    <div className="w-full min-w-0 pr-1 pb-2">
      {messages.map((m) => (
        <ChatMessageRow key={m.id} message={m} variant={variant} />
      ))}
    </div>
  );
}
