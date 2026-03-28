"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { Plus, Mic, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function focusInput(ref: { current: HTMLInputElement | null }) {
  queueMicrotask(() => ref.current?.focus());
}

type Props = {
  disabled?: boolean;
  onSend: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
};

export function ChatPillComposer({
  disabled,
  onSend,
  placeholder = "Ask anything",
  autoFocus,
  className,
}: Props) {
  const [v, setV] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wasDisabledRef = useRef(disabled);

  useEffect(() => {
    if (autoFocus) focusInput(inputRef);
  }, [autoFocus]);

  useEffect(() => {
    if (wasDisabledRef.current && !disabled) {
      focusInput(inputRef);
    }
    wasDisabledRef.current = disabled;
  }, [disabled]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.trim() || disabled) return;
    onSend(v);
    setV("");
    focusInput(inputRef);
  };

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex w-full max-w-2xl items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-2 pl-3 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-zinc-800/90 dark:shadow-xl sm:gap-2 sm:px-3 sm:pl-4",
        className,
      )}
    >
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Attach (coming soon)"
      >
        <Plus className="h-5 w-5 stroke-[1.5]" />
      </button>
      <input
        ref={inputRef}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-zinc-500"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Voice input (coming soon)"
      >
        <Mic className="h-5 w-5 stroke-[1.5]" />
      </button>
      <button
        type="submit"
        disabled={disabled || !v.trim()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition enabled:hover:bg-slate-800 disabled:opacity-35 dark:bg-white dark:text-zinc-900 dark:enabled:hover:bg-zinc-100"
        aria-label="Send"
      >
        <Send className="h-4 w-4 stroke-[2]" />
      </button>
    </form>
  );
}
