"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function AppHeader() {
  const pathname = usePathname();
  const chat = pathname === "/chat" || pathname?.startsWith("/chat/");

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center border-b",
        chat
          ? "border-white/10 bg-[#0d0d0d] text-zinc-100"
          : "border-slate-200 bg-white",
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-5xl items-center gap-6 px-4">
        <Link
          href="/"
          className={cn(
            "font-semibold",
            chat ? "text-white" : "text-slate-900",
          )}
        >
          AI Publishing
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link
            href="/chat"
            className={cn(
              "transition-colors",
              chat
                ? "text-zinc-400 hover:text-white"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            Chat
          </Link>
        </nav>
      </div>
    </header>
  );
}
