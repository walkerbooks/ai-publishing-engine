"use client";

import { useState } from "react";
import { useChatSessionBootstrap } from "@/hooks/use-chat-session-bootstrap";
import { useChatSessionSync } from "@/hooks/use-chat-session-sync";
import { ChatConversationSidebarPanel } from "@/components/chat/shell/chat-conversation-sidebar-panel";
import { ChatSidebarDrawer } from "@/components/chat/shell/chat-sidebar-drawer";
import { ChatShellTopBar } from "@/components/chat/shell/chat-shell-top-bar";
import { cn } from "@/lib/utils/cn";

type Props = {
  children: React.ReactNode;
  /** When false, hide conversation chrome (empty landing — no prior chats and no active thread). */
  showConversationChrome: boolean;
};

/**
 * Layout shell for /chat: optional desktop sidebar + mobile drawer, hydration + sync.
 */
export function ChatShell({ children, showConversationChrome }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  useChatSessionBootstrap();
  useChatSessionSync();

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-row overflow-hidden">
      <aside
        aria-hidden={!showConversationChrome}
        className={cn(
          "hidden shrink-0 flex-col overflow-hidden border-r bg-zinc-950/90 transition-[width,opacity,transform] duration-300 ease-out lg:flex",
          showConversationChrome
            ? "w-[280px] translate-x-0 border-white/10 opacity-100 xl:w-[300px]"
            : "pointer-events-none w-0 -translate-x-2 border-transparent opacity-0",
        )}
        aria-label="Book conversations sidebar"
      >
        <div className="flex h-full min-h-0 w-[280px] shrink-0 flex-col xl:w-[300px]">
          <div className="shrink-0 border-b border-white/10 px-3 py-3">
            <p className="text-sm font-semibold text-white">Smith Book</p>
            <p className="text-xs text-zinc-500">Your conversations</p>
          </div>
          <div className="chat-pane-scroll min-h-0 flex-1 p-2">
            <ChatConversationSidebarPanel />
          </div>
        </div>
      </aside>

      <ChatSidebarDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {showConversationChrome ? (
          <ChatShellTopBar onOpenSidebar={() => setDrawerOpen(true)} />
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
