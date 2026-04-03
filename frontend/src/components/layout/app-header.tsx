"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { authGreetingName } from "@/lib/auth/greeting-name";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils/cn";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const email = useAuthStore((s) => s.email);
  const firstName = useAuthStore((s) => s.firstName);
  const logout = useAuthStore((s) => s.logout);
  const reloginPrompt = useAuthStore((s) => s.reloginPrompt);
  const clearReloginPrompt = useAuthStore((s) => s.clearReloginPrompt);
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  useEffect(() => {
    if (reloginPrompt) {
      setSignupOpen(false);
      setLoginOpen(true);
    }
  }, [reloginPrompt]);

  const onLogout = () => {
    logout();
    router.push("/");
    router.refresh();
  };

  const greetingName = authGreetingName(isAuthenticated, firstName, email);

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center border-b border-walker-navy/15 bg-walker-mist/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-walker-mist/85 dark:border-walker-navy/40 dark:bg-walker-night supports-[backdrop-filter]:dark:bg-walker-night sm:min-h-18 sm:flex-nowrap sm:py-2">
      <div className="mx-auto flex min-h-0 min-w-0 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center justify-start gap-2 sm:gap-3">
          <Link
            href="/"
            className={cn(
              "inline-flex shrink-0 items-center touch-manipulation rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-walker-teal focus-visible:ring-offset-2 focus-visible:ring-offset-walker-mist dark:focus-visible:ring-offset-walker-charcoal",
            )}
            aria-label="Walkerbook home"
          >
            <Image
              src="/walkerbook/Walkerbook logo with hiker silhouette.png"
              alt=""
              width={70}
              height={60}
              className="block w-auto h-auto"
              priority
            />
          </Link>
          <nav
            className="flex shrink-0 items-center justify-start gap-x-1 text-left text-sm"
            aria-label="Primary"
          >
            <Link
              href="/"
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-2 text-left font-medium touch-manipulation transition-colors",
                pathname === "/"
                  ? "bg-slate-200/90 text-[#1f4c85] dark:bg-white/15 dark:text-white"
                  : "text-walker-navy/90 hover:bg-slate-100/80 hover:text-walker-charcoal dark:text-walker-mist/85 dark:hover:bg-white/10 dark:hover:text-white",
              )}
            >
              Home
            </Link>
            <Link
              href="/chat?new=1"
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-2 text-left font-medium touch-manipulation transition-colors",
                pathname === "/chat"
                  ? "bg-slate-200/90 text-[#1f4c85] dark:bg-white/15 dark:text-white"
                  : "text-walker-navy/90 hover:bg-slate-100/80 hover:text-walker-charcoal dark:text-walker-mist/85 dark:hover:bg-white/10 dark:hover:text-white",
              )}
            >
              Chat
            </Link>
            <Link
              href="/#how-it-works"
              className={cn(
                "rounded-lg px-3 py-2 text-left font-medium leading-tight touch-manipulation transition-colors",
                "text-walker-navy/90 hover:bg-slate-100/80 hover:text-walker-charcoal dark:text-walker-mist/85 dark:hover:bg-white/10 dark:hover:text-white",
              )}
              onClick={(e) => {
                if (pathname !== "/") return;
                e.preventDefault();
                const id = "how-it-works";
                const el = document.getElementById(id);
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
                if (typeof window !== "undefined") {
                  window.history.pushState(null, "", `${window.location.pathname}#${id}`);
                }
              }}
            >
              How it works
            </Link>
            
          </nav>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <>
              <span
                className={cn(
                  "inline max-w-[min(12rem,42vw)] truncate text-xs text-muted-foreground sm:max-w-[220px] sm:text-sm",
                  greetingName ? "" : "italic",
                )}
                title={email ?? undefined}
              >
                {greetingName ? `Hi, ${greetingName}` : "Signed in"}
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
            <>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="touch-manipulation"
                onClick={() => {
                  setSignupOpen(false);
                  setLoginOpen(true);
                }}
              >
                Log in
              </Button>
              <Button
                size="sm"
                type="button"
                className="touch-manipulation"
                onClick={() => {
                  setLoginOpen(false);
                  setSignupOpen(true);
                }}
              >
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog
        open={loginOpen}
        onOpenChange={(open) => {
          setLoginOpen(open);
          if (!open) clearReloginPrompt();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="sr-only">Log in</DialogTitle>
          <LoginForm
            variant="dialog"
            redirectAfterLogin="/chat"
            onAuthenticated={() => {
              setLoginOpen(false);
              clearReloginPrompt();
            }}
            onSwitchToSignup={() => {
              setLoginOpen(false);
              setSignupOpen(true);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="sr-only">Sign up</DialogTitle>
          <SignupForm
            variant="dialog"
            redirectAfterSignup="/chat"
            onAuthenticated={() => setSignupOpen(false)}
            onSwitchToLogin={() => {
              setSignupOpen(false);
              setLoginOpen(true);
            }}
          />
        </DialogContent>
      </Dialog>
    </header>
  );
}
