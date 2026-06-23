"use client";

import { usePathname } from "next/navigation";
import { useCallback, useMemo, type MouseEvent } from "react";
import { useAuthStore } from "@/stores/auth-store";

export type AppNavItem = {
  href: string;
  label: string;
  active: boolean;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
};

export function useAppNavItems(): AppNavItem[] {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);

  const scrollToHowItWorks = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== "/") return;
    e.preventDefault();
    const id = "how-it-works";
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", `${window.location.pathname}#${id}`);
    }
  }, [pathname]);

  return useMemo((): AppNavItem[] => {
    const items: AppNavItem[] = [
      { href: "/", label: "Home", active: pathname === "/" },
      {
        href: role === "admin" ? "/chat?app=1&new=1" : "/chat?new=1",
        label: "Chat",
        active: pathname === "/chat",
      },
    ];
    items.push({
      href: "/pricing",
      label: "Pricing",
      active: pathname === "/pricing",
    });
    if (role === "admin") {
      items.push({
        href: "/admin",
        label: "Dashboard",
        active: pathname.startsWith("/admin"),
      });
    }
    items.push({
      href: "/#how-it-works",
      label: "How it works",
      active: false,
      onClick: scrollToHowItWorks,
    });
    return items;
  }, [pathname, role, scrollToHowItWorks]);
}
