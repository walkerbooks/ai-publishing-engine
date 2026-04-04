"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { authGreetingName } from "@/lib/auth/greeting-name";
import { useAuthStore } from "@/stores/auth-store";
import { useAuthDialogRequestStore } from "@/stores/auth-dialog-request-store";
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

  const loginRequestId = useAuthDialogRequestStore((s) => s.loginRequestId);
  const signupRequestId = useAuthDialogRequestStore((s) => s.signupRequestId);
  const prevLoginReq = useRef(loginRequestId);
  const prevSignupReq = useRef(signupRequestId);

  useEffect(() => {
    if (reloginPrompt) {
      setSignupOpen(false);
      setLoginOpen(true);
    }
  }, [reloginPrompt]);

  useEffect(() => {
    if (loginRequestId !== prevLoginReq.current && loginRequestId > 0) {
      prevLoginReq.current = loginRequestId;
      setSignupOpen(false);
      setLoginOpen(true);
    }
  }, [loginRequestId]);

  useEffect(() => {
    if (signupRequestId !== prevSignupReq.current && signupRequestId > 0) {
      prevSignupReq.current = signupRequestId;
      setLoginOpen(false);
      setSignupOpen(true);
    }
  }, [signupRequestId]);

  const onLogout = () => {
    logout();
    router.push("/");
    router.refresh();
  };

  const greetingName = authGreetingName(isAuthenticated, firstName, email);

  const navLinkClass = (active: boolean) =>
    cn(
      "shrink-0 whitespace-nowrap rounded-lg text-left font-medium touch-manipulation transition-colors",
      "px-1.5 py-1.5 text-[11px] leading-tight min-[380px]:px-2 min-[380px]:text-xs sm:px-3 sm:py-2 sm:text-sm",
      active
        ? "bg-slate-200/90 text-[#1f4c85] dark:bg-white/15 dark:text-white"
        : "text-walker-navy/90 hover:bg-slate-100/80 hover:text-walker-charcoal dark:text-walker-mist/85 dark:hover:bg-white/10 dark:hover:text-white",
    );

  return (
    <header
      data-app-header
      className="min-h-16 shrink-0 border-b border-walker-navy/15 bg-walker-mist/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-walker-mist/85 dark:border-walker-navy/40 dark:bg-walker-night supports-[backdrop-filter]:dark:bg-walker-night sm:min-h-18 sm:py-2"
    >
      <div className="mx-auto min-h-0 min-w-0 w-full max-w-5xl px-2 min-[380px]:px-3 sm:px-4">
        <div className="flex min-h-0 min-w-0 flex-nowrap items-center justify-between gap-1.5 min-[380px]:gap-2 sm:gap-4">
          <div className="flex min-h-0 min-w-0 flex-1 flex-nowrap items-center justify-start gap-1.5 overflow-hidden min-[380px]:gap-2 sm:gap-3">
            <Link
              href="/"
              className={cn(
                "inline-flex shrink-0 touch-manipulation rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-walker-teal focus-visible:ring-offset-2 focus-visible:ring-offset-walker-mist dark:focus-visible:ring-offset-walker-charcoal",
              )}
              aria-label="Walkerbook home"
            >
              <Image
                src="/walkerbook/Walkerbook logo with hiker silhouette.png"
                alt=""
                width={70}
                height={60}
                className="block h-9 w-auto max-h-9 object-contain min-[380px]:h-10 min-[380px]:max-h-10 sm:h-auto sm:max-h-none"
                priority
              />
            </Link>
            <nav
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-nowrap items-center justify-start gap-x-0 overflow-x-auto overscroll-x-contain",
                "touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] min-[380px]:gap-x-0.5 sm:gap-x-1 [&::-webkit-scrollbar]:hidden",
              )}
              aria-label="Primary"
            >
              <Link href="/" className={navLinkClass(pathname === "/")}>
                Home
              </Link>
              <Link href="/chat?new=1" className={navLinkClass(pathname === "/chat")}>
                Chat
              </Link>
              <Link
                href="/#how-it-works"
                className={navLinkClass(false)}
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

          <div className="flex shrink-0 items-center justify-end gap-1 min-[380px]:gap-1.5 sm:gap-3">
            <ThemeToggle className="origin-right scale-[0.88] min-[380px]:scale-95 sm:scale-100" />
            {isAuthenticated ? (
              <>
                <span
                  className={cn(
                    "hidden min-[420px]:inline max-w-[min(7rem,22vw)] truncate text-[11px] text-muted-foreground sm:max-w-[220px] sm:text-sm",
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
                  className="h-8 shrink-0 touch-manipulation px-2 text-[11px] min-[380px]:h-9 min-[380px]:px-2.5 min-[380px]:text-xs sm:h-10 sm:px-4 sm:text-sm"
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
                  className="h-8 shrink-0 touch-manipulation px-2 text-[11px] min-[380px]:h-9 min-[380px]:px-2.5 min-[380px]:text-xs sm:h-10 sm:px-4 sm:text-sm"
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
                  className="h-8 shrink-0 touch-manipulation px-2 text-[11px] min-[380px]:h-9 min-[380px]:px-2.5 min-[380px]:text-xs sm:h-10 sm:px-4 sm:text-sm"
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
      </div>
    </header>
  );
}
