"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-full w-full max-w-5xl items-center gap-4 px-4 sm:gap-6">
        <Link href="/" className="font-semibold text-foreground">
          AI Publishing
        </Link>
        <nav className="flex flex-1 items-center gap-4 text-sm sm:gap-6">
          <Link
            href="/chat"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Chat
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
