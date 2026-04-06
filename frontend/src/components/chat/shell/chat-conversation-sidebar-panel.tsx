"use client";

import { Trash2 } from "lucide-react";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { cn } from "@/lib/utils/cn";

type Props = {
  /** Close mobile drawer after selecting a row */
  onNavigate?: () => void;
  className?: string;
};

/**
 * Conversation list UI only — no chat logic beyond store selectors (SOC).
 */
export function ChatConversationSidebarPanel({
  onNavigate,
  className,
}: Props) {
  const conversations = useChatDirectoryStore((s) => s.conversations);
  const activeConversationId = useChatDirectoryStore(
    (s) => s.activeConversationId,
  );
  const selectConversation = useChatDirectoryStore(
    (s) => s.selectConversation,
  );
  const startNewConversation = useChatDirectoryStore(
    (s) => s.startNewConversation,
  );
  const removeConversation = useChatDirectoryStore(
    (s) => s.removeConversation,
  );

  return (
    <nav
      className={cn("flex flex-col gap-3", className)}
      aria-label="Book conversations"
    >
      <button
        type="button"
        onClick={() => {
          void startNewConversation().then(() => onNavigate?.());
        }}
        className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
      >
        New book chat
      </button>

      <div>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Your books
        </p>
        {conversations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-muted-foreground dark:border-white/10">
            No conversations yet. Send a message to start your first book.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {conversations.map((c) => {
              const active = c.id === activeConversationId;
              return (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    aria-current={active ? "true" : undefined}
                    onClick={() => {
                      void selectConversation(c.id).then(() => onNavigate?.());
                    }}
                    className={cn(
                      "flex min-h-[44px] w-full items-center rounded-xl border px-3 py-2.5 pr-10 text-left text-sm transition",
                      active
                        ? "border-slate-300 bg-slate-200/80 text-slate-900 dark:border-white/25 dark:bg-white/10 dark:text-white"
                        : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100 dark:text-zinc-300 dark:hover:border-white/10 dark:hover:bg-white/5",
                    )}
                  >
                    <span className="line-clamp-2">{c.title}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${c.title}`}
                    onClick={(e) => {
                      e.preventDefault();
                      void removeConversation(c.id).then(() => onNavigate?.());
                    }}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground opacity-70 transition hover:bg-slate-200 hover:text-slate-900 group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
