"use client";

import { Menu } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  onOpenSidebar: () => void;
  /** Show when a book outline exists (mobile drawer trigger). */
  showGeneratedOutlineButton?: boolean;
  onOpenGeneratedOutline?: () => void;
  className?: string;
};

/**
 * Compact top bar for small / medium viewports (drawer trigger).
 */
export function ChatShellTopBar({
  onOpenSidebar,
  showGeneratedOutlineButton = false,
  onOpenGeneratedOutline,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 border-b border-slate-200/90 bg-background/95 px-3 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-[#0d0d0d]/95 lg:hidden",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenSidebar}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
        aria-label="Open conversations"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">Smith Book</p>
        <p className="truncate text-xs text-muted-foreground">Unified chat</p>
      </div>
      {showGeneratedOutlineButton && onOpenGeneratedOutline ? (
        <button
          type="button"
          onClick={onOpenGeneratedOutline}
          className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 sm:px-3 sm:text-sm"
        >
          <span className="hidden min-[380px]:inline">Generated outline</span>
          <span className="min-[380px]:hidden">Outline</span>
        </button>
      ) : null}
    </div>
  );
}
