"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import { AppMobileNavSidebar } from "@/components/layout/app-mobile-nav-sidebar";
import { authGreetingName } from "@/lib/auth/greeting-name";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils/cn";

/**
 * Public app chrome (header + gradient). Admin routes use a dedicated dashboard shell instead.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdminArea = pathname.startsWith("/admin");
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const email = useAuthStore((s) => s.email);
  const firstName = useAuthStore((s) => s.firstName);
  const logout = useAuthStore((s) => s.logout);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const greetingName = authGreetingName(isAuthenticated, firstName, email);

  if (isAdminArea) {
    return (
      <div className={cn("flex min-h-dvh flex-col bg-slate-950 text-slate-100")}>{children}</div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden">
      <AppHeader
        mobileNavOpen={mobileNavOpen}
        onMobileNavToggle={() => setMobileNavOpen((open) => !open)}
      />

      <AppMobileNavSidebar
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        isAuthenticated={isAuthenticated}
        greetingName={greetingName}
        email={email}
        onLogout={() => {
          setMobileNavOpen(false);
          logout();
          router.push("/");
          router.refresh();
        }}
      />

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col transition-transform duration-300 ease-out sm:translate-x-0",
          mobileNavOpen && "translate-x-[280px] sm:translate-x-0",
        )}
        onClick={mobileNavOpen ? () => setMobileNavOpen(false) : undefined}
      >
        <div
          className="h-0.5 w-full shrink-0 bg-gradient-to-r from-walker-charcoal via-walker-navy to-walker-teal"
          aria-hidden
        />
        <main className="flex min-h-0 flex-1 flex-col bg-background text-foreground">{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}
