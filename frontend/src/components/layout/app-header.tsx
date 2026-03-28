"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils/cn";

export function AppHeader() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const email = useAuthStore((s) => s.email);
  const firstName = useAuthStore((s) => s.firstName);
  const logout = useAuthStore((s) => s.logout);

  const onLogout = () => {
    logout();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center border-b border-border bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:h-14 sm:flex-nowrap sm:py-0">
      <div className="mx-auto flex min-h-0 min-w-0 w-full max-w-5xl items-center gap-3 px-4 sm:gap-6">
        <Link
          href="/"
          className="shrink-0 font-semibold text-foreground touch-manipulation"
        >
          AI Publishing
        </Link>
        <nav className="flex flex-1 items-center gap-4 text-sm sm:gap-6">
          <Link
            href="/chat"
            className="-mx-1 rounded-md px-1 py-2 text-muted-foreground touch-manipulation transition-colors hover:text-foreground sm:py-0"
          >
            Chat
          </Link>
        </nav>
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <span
                className={cn(
                  "inline max-w-[min(12rem,42vw)] truncate text-xs text-muted-foreground sm:max-w-[220px] sm:text-sm",
                  firstName || email ? "" : "italic",
                )}
                title={email ?? undefined}
              >
                {firstName
                  ? `Hi, ${firstName}`
                  : (email ?? "Signed in")}
              </span>
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="shrink-0 touch-manipulation"
                onClick={onLogout}
              >
                Log out
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" className="touch-manipulation" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
