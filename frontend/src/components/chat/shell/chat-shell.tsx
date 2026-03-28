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
  /** Mobile: show “Generated outline” next to menu when an outline exists. */
  showGeneratedOutlineButton?: boolean;
  onOpenGeneratedOutline?: () => void;
  /** Called before opening the conversations drawer (e.g. close outline drawer). */
  onSidebarWillOpen?: () => void;
};

/**
 * Layout shell for /chat: optional desktop sidebar + mobile drawer, hydration + sync.
 */
export function ChatShell({
  children,
  showConversationChrome,
  showGeneratedOutlineButton = false,
  onOpenGeneratedOutline,
  onSidebarWillOpen,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openSidebar = () => {
    onSidebarWillOpen?.();
    setDrawerOpen(true);
  };
  useChatSessionBootstrap();
  useChatSessionSync();

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-row overflow-hidden">
      <aside
        aria-hidden={!showConversationChrome}
        className={cn(
          "hidden min-h-0 shrink-0 flex-col overflow-hidden border-r border-border bg-slate-100/95 transition-[width,opacity,transform] duration-300 ease-out dark:border-transparent dark:bg-zinc-950/90 lg:flex",
          showConversationChrome
            ? "w-[280px] translate-x-0 border-border opacity-100 dark:border-white/10 xl:w-[300px]"
            : "pointer-events-none w-0 -translate-x-2 border-transparent opacity-0",
        )}
        aria-label="Book conversations sidebar"
      >
        <div className="flex min-h-0 min-w-0 w-[280px] flex-1 flex-col overflow-hidden xl:w-[300px]">
          <div className="shrink-0 border-b border-border px-3 py-3 dark:border-white/10">
            <p className="text-sm font-semibold text-foreground">Smith Book</p>
            <p className="text-xs text-muted-foreground">Your conversations</p>
          </div>
          <div className="chat-pane-scroll min-h-0 min-w-0 flex-1 basis-0 overflow-y-auto overscroll-contain p-2">
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
          <ChatShellTopBar
            onOpenSidebar={openSidebar}
            showGeneratedOutlineButton={showGeneratedOutlineButton}
            onOpenGeneratedOutline={onOpenGeneratedOutline}
          />
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
