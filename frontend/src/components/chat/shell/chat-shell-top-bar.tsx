"use client";

import { Menu } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  onOpenSidebar: () => void;
  className?: string;
};

/**
 * Compact top bar for small / medium viewports (drawer trigger).
 */
export function ChatShellTopBar({ onOpenSidebar, className }: Props) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#0d0d0d]/95 px-3 py-2 backdrop-blur-sm lg:hidden",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenSidebar}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white hover:bg-white/10"
        aria-label="Open conversations"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">Smith Book</p>
        <p className="truncate text-xs text-zinc-500">Unified chat</p>
      </div>
    </div>
  );
}
