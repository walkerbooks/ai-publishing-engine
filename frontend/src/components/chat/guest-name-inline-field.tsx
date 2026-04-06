"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  disabled?: boolean;
  onSend: (text: string) => void;
  variant?: "light" | "dark";
  placeholder?: string;
  autoComplete?: string;
  ariaLabel?: string;
  submitAriaLabel?: string;
  inputType?: "text" | "email";
};

export function GuestNameInlineField({
  disabled,
  onSend,
  variant = "light",
  placeholder = "type your name...",
  autoComplete = "name",
  ariaLabel = "Type your name",
  submitAriaLabel = "Send name",
  inputType = "text",
}: Props) {
  const [v, setV] = useState("");
  const dark = variant === "dark";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = v.trim();
    if (!t || disabled) return;
    if (inputType === "email" && !t.includes("@")) return;
    onSend(t);
    setV("");
  };

  return (
    <form
      onSubmit={submit}
      className="flex w-full items-stretch gap-2"
    >
      <input
        className={cn(
          "min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2",
          dark
            ? "border-white/15 bg-white/[0.07] text-zinc-100 placeholder:text-zinc-500 focus:ring-white/20"
            : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-slate-900/20",
        )}
        type={inputType}
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        inputMode={inputType === "email" ? "email" : undefined}
      />
      <button
        type="submit"
        disabled={
          disabled ||
          !v.trim() ||
          (inputType === "email" && !v.trim().includes("@"))
        }
        className={cn(
          "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg shadow-md transition disabled:opacity-35",
          dark
            ? "bg-white text-zinc-900 enabled:hover:bg-zinc-100"
            : "bg-slate-900 text-white enabled:hover:bg-slate-800",
        )}
        aria-label={submitAriaLabel}
      >
        <Send className="h-4 w-4 stroke-[2]" />
      </button>
    </form>
  );
}
