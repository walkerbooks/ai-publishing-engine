"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { ChatConversationSidebarPanel } from "@/components/chat/shell/chat-conversation-sidebar-panel";
import { cn } from "@/lib/utils/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  className?: string;
};

/**
 * Mobile / tablet (&lt; lg) slide-over for the conversation list.
 */
export function ChatSidebarDrawer({ open, onClose, className }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
        className,
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close menu"
        className={cn(
          "absolute inset-0 bg-black/60 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "absolute left-0 top-0 flex h-full w-[min(100vw-3rem,300px)] max-w-[85vw] flex-col border-r border-border bg-background shadow-2xl transition-transform duration-300 ease-out dark:border-white/10 dark:bg-walker-night sm:w-[min(100vw-4rem,320px)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Conversations"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-3 dark:border-white/10">
          <span className="text-sm font-semibold text-foreground">Conversations</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="chat-pane-scroll min-h-0 min-w-0 flex-1 basis-0 overflow-y-auto overscroll-contain p-2">
          <ChatConversationSidebarPanel onNavigate={onClose} />
        </div>
      </aside>
    </div>
  );
}
