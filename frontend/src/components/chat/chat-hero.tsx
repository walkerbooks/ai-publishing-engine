"use client";

import { WELCOME_OPTIONS } from "@/lib/constants/welcome";
import { ChatPillComposer } from "@/components/chat/chat-pill-composer";
import { cn } from "@/lib/utils/cn";

type Props = {
  disabled?: boolean;
  onSend: (text: string) => void;
  onQuickPick: (option: string) => void;
  className?: string;
};

export function ChatHero({
  disabled,
  onSend,
  onQuickPick,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-8 text-center",
        className,
      )}
    >
      <div className="space-y-2 px-2">
        <h1 className="text-balance text-2xl font-medium tracking-tight text-white sm:text-3xl">
          What&apos;s on your mind today?
        </h1>
        <p className="mx-auto max-w-md text-sm text-zinc-500">
          Describe the book you want to create — genre, audience, and tone. Or
          tap a quick start below.
        </p>
      </div>

      <ChatPillComposer
        disabled={disabled}
        onSend={onSend}
        placeholder="Ask anything"
        autoFocus
        className="mx-auto"
      />

      <div className="w-full max-w-2xl space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-600">
          Quick start
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {WELCOME_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => onQuickPick(opt)}
              className="rounded-full border border-white/10 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-200 transition hover:border-white/20 hover:bg-zinc-800 disabled:opacity-40"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
