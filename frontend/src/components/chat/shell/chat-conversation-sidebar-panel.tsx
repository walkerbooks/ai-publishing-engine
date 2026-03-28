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
          startNewConversation();
          onNavigate?.();
        }}
        className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-left text-sm font-medium text-white transition hover:bg-white/15 min-h-[44px]"
      >
        New book chat
      </button>

      <div>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Your books
        </p>
        {conversations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-sm text-zinc-500">
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
                      selectConversation(c.id);
                      onNavigate?.();
                    }}
                    className={cn(
                      "flex w-full min-h-[44px] items-center rounded-xl border px-3 py-2.5 pr-10 text-left text-sm transition",
                      active
                        ? "border-white/25 bg-white/10 text-white"
                        : "border-transparent text-zinc-300 hover:border-white/10 hover:bg-white/5",
                    )}
                  >
                    <span className="line-clamp-2">{c.title}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${c.title}`}
                    onClick={(e) => {
                      e.preventDefault();
                      removeConversation(c.id);
                      onNavigate?.();
                    }}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 opacity-70 transition hover:bg-white/10 hover:text-zinc-200 group-hover:opacity-100"
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
