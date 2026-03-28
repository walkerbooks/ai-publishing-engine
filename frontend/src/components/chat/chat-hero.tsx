"use client";

import { ChatPillComposer } from "@/components/chat/chat-pill-composer";
import { cn } from "@/lib/utils/cn";

type Props = {
  disabled?: boolean;
  onSend: (text: string) => void;
  className?: string;
};

export function ChatHero({ disabled, onSend, className }: Props) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-8 text-center",
        className,
      )}
    >
      <div className="space-y-2 px-2">
        <h1 className="text-balance text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          What&apos;s on your mind today?
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Describe the book you want to create — genre, audience, and tone — and
          we&apos;ll go from there.
        </p>
      </div>

      <ChatPillComposer
        disabled={disabled}
        onSend={onSend}
        placeholder="Ask anything"
        autoFocus
        className="mx-auto"
      />
    </div>
  );
}
