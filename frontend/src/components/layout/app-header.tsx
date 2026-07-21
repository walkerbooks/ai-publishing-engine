"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAppNavItems } from "@/components/layout/use-app-nav-items";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { authGreetingName } from "@/lib/auth/greeting-name";
import { useAuthStore } from "@/stores/auth-store";
import { useAuthDialogRequestStore } from "@/stores/auth-dialog-request-store";
import { cn } from "@/lib/utils/cn";

type Props = {
  mobileNavOpen?: boolean;
  onMobileNavToggle?: () => void;
};

export function AppHeader({ mobileNavOpen = false, onMobileNavToggle }: Props) {
  const router = useRouter();
  const navItems = useAppNavItems();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const email = useAuthStore((s) => s.email);
  const firstName = useAuthStore((s) => s.firstName);
  const logout = useAuthStore((s) => s.logout);
  const reloginPrompt = useAuthStore((s) => s.reloginPrompt);
  const clearReloginPrompt = useAuthStore((s) => s.clearReloginPrompt);
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const lastScrollY = useRef(0);

  const loginRequestId = useAuthDialogRequestStore((s) => s.loginRequestId);
  const signupRequestId = useAuthDialogRequestStore((s) => s.signupRequestId);
  const prevLoginReq = useRef(loginRequestId);
  const prevSignupReq = useRef(signupRequestId);

  useEffect(() => {
    const scrollY = () =>
      window.scrollY || document.documentElement.scrollTop || 0;

    lastScrollY.current = scrollY();

    const onScroll = () => {
      const y = scrollY();
      const delta = y - lastScrollY.current;

      if (y < 8) {
        setNavHidden(false);
      } else if (delta > 4) {
        setNavHidden(true);
      } else if (delta < -4) {
        setNavHidden(false);
      }

      lastScrollY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      "inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-lg text-left text-sm font-medium touch-manipulation transition-colors",
      "px-3 py-2",
      active
        ? "bg-slate-200/90 text-[#1f4c85] dark:bg-white/15 dark:text-white"
        : "text-walker-navy/90 hover:bg-slate-100/80 hover:text-walker-charcoal dark:text-walker-mist/85 dark:hover:bg-white/10 dark:hover:text-white",
    );

  const hideNav = navHidden && !mobileNavOpen;

  return (
    <>
      <header
        data-app-header
        className={cn(
          "fixed inset-x-0 top-0 z-50 min-h-16 border-b border-walker-navy/15 bg-walker-mist/95 py-2 backdrop-blur transition-transform duration-300 ease-out supports-[backdrop-filter]:bg-walker-mist/85 dark:border-walker-navy/40 dark:bg-walker-night supports-[backdrop-filter]:dark:bg-walker-night sm:min-h-18 sm:py-2",
          hideNav ? "-translate-y-full pointer-events-none" : "translate-y-0",
        )}
      >
        <div className="mx-auto min-h-0 min-w-0 w-full max-w-5xl px-2 min-[380px]:px-3 sm:px-4">
          <div className="flex min-h-0 min-w-0 flex-nowrap items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-h-0 min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <button
                type="button"
                className={cn(
                  "flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border transition-colors sm:hidden",
                  mobileNavOpen
                    ? "border-walker-teal/40 bg-walker-teal/15 text-walker-navy dark:border-walker-teal/50 dark:bg-walker-teal/20 dark:text-walker-mist"
                    : "border-walker-navy/20 bg-white/60 text-walker-navy hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-walker-mist dark:hover:bg-white/10",
                )}
                aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileNavOpen}
                onClick={onMobileNavToggle}
              >
                {mobileNavOpen ? (
                  <X className="h-5 w-5" strokeWidth={1.75} />
                ) : (
                  <Menu className="h-5 w-5" strokeWidth={1.75} />
                )}
              </button>

              <Link
                href="/"
                className={cn(
                  "inline-flex shrink-0 touch-manipulation rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-walker-teal focus-visible:ring-offset-2 focus-visible:ring-offset-walker-mist dark:focus-visible:ring-offset-walker-charcoal",
                )}
                aria-label="WalkerBook home"
              >
                <Image
                  src="/walkerbook/Walkerbook logo with hiker silhouette.png"
                  alt=""
                  width={70}
                  height={60}
                  className="block h-8 w-auto max-h-8 max-w-[7.5rem] object-contain object-left min-[380px]:h-10 min-[380px]:max-h-10 min-[380px]:max-w-none sm:h-auto sm:max-h-none"
                  priority
                />
              </Link>

              <nav
                className="hidden min-h-0 min-w-0 flex-1 flex-nowrap items-center gap-1 sm:flex"
                aria-label="Primary"
              >
                {navItems.map((item) => (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={navLinkClass(item.active)}
                    onClick={item.onClick}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1 min-[380px]:gap-1.5 sm:gap-3">
              <ThemeToggle className="hidden sm:inline-flex" />
              <div className="flex items-center gap-1 min-[380px]:gap-1.5 sm:gap-3">
                {isAuthenticated ? (
                  <>
                    <span
                      className={cn(
                        "hidden min-[420px]:inline max-w-[min(7rem,22vw)] truncate text-xs text-muted-foreground sm:max-w-[220px] sm:text-sm",
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
                      className="h-9 min-h-[44px] shrink-0 touch-manipulation px-2.5 text-xs min-[380px]:px-3 sm:h-10 sm:px-4 sm:text-sm"
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
                      className="h-9 min-h-[44px] shrink-0 touch-manipulation px-2.5 text-xs min-[380px]:px-3 sm:h-10 sm:px-4 sm:text-sm"
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
                      className="h-9 min-h-[44px] shrink-0 touch-manipulation px-2.5 text-xs min-[380px]:px-3 sm:h-10 sm:px-4 sm:text-sm"
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
              <DialogDescription className="sr-only">
                Sign in with your email and password to continue.
              </DialogDescription>
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
              <DialogDescription className="sr-only">
                Create an account with your email and password.
              </DialogDescription>
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
      {/* Keeps page layout offset while the header is fixed. */}
      <div className="min-h-16 shrink-0 sm:min-h-18" aria-hidden />
    </>
  );
}
