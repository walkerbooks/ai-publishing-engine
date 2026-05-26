"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { cn } from "@/lib/utils/cn";

/**
 * Public app chrome (header + gradient). Admin routes use a dedicated dashboard shell instead.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminArea = pathname.startsWith("/admin");

  if (isAdminArea) {
    return (
      <div className={cn("flex min-h-dvh flex-col bg-slate-950 text-slate-100")}>{children}</div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <div
        className="h-0.5 w-full shrink-0 bg-gradient-to-r from-walker-charcoal via-walker-navy to-walker-teal"
        aria-hidden
      />
      <main className="flex min-h-0 flex-1 flex-col bg-background text-foreground">{children}</main>
    </div>
  );
}
