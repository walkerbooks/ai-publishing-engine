"use client";

import type { ChatMessage } from "@/lib/types/chat";
import { ChatMessageRow } from "@/components/chat/chat-message-row";
import { useChatScroll } from "@/hooks/use-chat-scroll";

type Props = { messages: ChatMessage[] };

export function ChatThread({ messages }: Props) {
  const endRef = useChatScroll(messages);
  return (
    <div className="max-h-[55vh] min-h-[200px] overflow-y-auto pr-2">
      {messages.map((m, i) => (
        <ChatMessageRow key={m.id} message={m} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
