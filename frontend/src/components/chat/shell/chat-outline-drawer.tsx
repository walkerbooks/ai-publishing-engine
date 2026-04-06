"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { ChatOutlineSidecard } from "@/components/chat/chat-outline-sidecard";
import { cn } from "@/lib/utils/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  outline: Record<string, unknown> | null;
  className?: string;
};

/**
 * Mobile / tablet: slide-over from the right for the generated outline (lg+ uses fixed column).
 */
export function ChatOutlineDrawer({ open, onClose, outline, className }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!outline) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[48] lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
        className,
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close outline and return to chat"
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-[min(100vw-2.5rem,320px)] max-w-[92vw] flex-col border-l border-border bg-slate-100 shadow-2xl transition-transform duration-300 ease-out dark:border-white/10 dark:bg-walker-hero-night",
          open ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Generated outline"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5 dark:border-white/10">
          <span className="truncate text-sm font-semibold text-foreground">Generated outline</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-200/80 hover:text-foreground dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close outline"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 pt-2">
          <ChatOutlineSidecard
            outline={outline}
            variant="sidebar"
            hideShellTitle
            className="min-h-0 flex-1 border-0 bg-transparent p-0 shadow-none backdrop-blur-none dark:bg-transparent"
          />
        </div>
      </aside>
    </div>
  );
}
