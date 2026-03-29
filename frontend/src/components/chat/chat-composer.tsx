"use client";

import { ChatPillComposer } from "@/components/chat/chat-pill-composer";
import { cn } from "@/lib/utils/cn";

type Props = {
  disabled?: boolean;
  onSend: (text: string) => void;
  /** `dock` = bottom bar (full width pill); omit for same styling without extra margin */
  variant?: "dock" | "default";
};

export function ChatComposer({ disabled, onSend, variant = "default" }: Props) {
  return (
    <ChatPillComposer
      disabled={disabled}
      onSend={onSend}
      placeholder="Message Smith Book…"
      autoFocus={variant === "dock"}
      className={cn("max-w-none", variant === "dock" && "w-full")}
    />
  );
}
