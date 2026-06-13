"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAppNavItems } from "@/components/layout/use-app-nav-items";
import { useAuthDialogRequestStore } from "@/stores/auth-dialog-request-store";
import { cn } from "@/lib/utils/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  greetingName: string | null;
  email: string | null;
  onLogout: () => void;
};

/** Mobile site nav — fixed left column below header; main content shifts right when open. */
export function AppMobileNavSidebar({
  open,
  onClose,
  isAuthenticated,
  greetingName,
  email,
  onLogout,
}: Props) {
  const items = useAppNavItems();
  const requestLogin = useAuthDialogRequestStore((s) => s.requestLogin);
  const requestSignup = useAuthDialogRequestStore((s) => s.requestSignup);

  const linkClass = (active: boolean) =>
    cn(
      "flex min-h-[48px] w-full items-center rounded-lg px-3 text-base font-medium touch-manipulation transition-colors",
      active
        ? "bg-slate-200/90 text-[#1f4c85] dark:bg-white/15 dark:text-white"
        : "text-walker-navy/90 hover:bg-slate-100/80 hover:text-walker-charcoal dark:text-walker-mist/85 dark:hover:bg-white/10 dark:hover:text-white",
    );

  return (
    <aside
      className={cn(
        "fixed left-0 z-40 flex w-[280px] flex-col border-r border-border bg-white/40 backdrop-blur-xl",
        "top-[calc(4rem+0.125rem)] h-[calc(100dvh-4rem-0.125rem)]",
        "transition-transform duration-300 ease-out dark:border-white/10 dark:bg-walker-night dark:backdrop-blur-none",
        "sm:hidden",
        open ? "translate-x-0" : "-translate-x-full pointer-events-none",
      )}
      aria-hidden={!open}
      aria-label="Site navigation"
    >
      <div className="shrink-0 border-b border-border px-3 py-3 dark:border-walker-navy/40">
        <p className="text-sm font-semibold text-walker-navy dark:text-walker-mist">
          Walker<span className="text-walker-teal">book</span>
        </p>
        <p className="text-xs text-muted-foreground">Menu</p>
      </div>

      <nav
        className="chat-pane-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
        aria-label="Primary"
      >
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={`${item.href}-${item.label}`}>
              <Link
                href={item.href}
                className={linkClass(item.active)}
                onClick={(e) => {
                  item.onClick?.(e);
                  onClose();
                }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="shrink-0 space-y-3 border-t border-border p-3 dark:border-white/10">
        <div className="flex items-center justify-between gap-3 px-1">
          <span className="text-sm text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>

        {isAuthenticated ? (
          <div className="space-y-2">
            <p
              className={cn(
                "truncate px-1 text-sm text-muted-foreground",
                greetingName ? "" : "italic",
              )}
              title={email ?? undefined}
            >
              {greetingName ? `Hi, ${greetingName}` : "Signed in"}
            </p>
            <Button
              variant="outline"
              type="button"
              className="h-11 w-full touch-manipulation"
              onClick={() => {
                onClose();
                onLogout();
              }}
            >
              Log out
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="h-11 w-full touch-manipulation"
              onClick={() => {
                onClose();
                requestSignup();
              }}
            >
              Sign up
            </Button>
            <Button
              variant="outline"
              type="button"
              className="h-11 w-full touch-manipulation"
              onClick={() => {
                onClose();
                requestLogin();
              }}
            >
              Log in
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
