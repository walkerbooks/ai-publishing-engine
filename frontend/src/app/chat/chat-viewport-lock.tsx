"use client";

import { useEffect } from "react";

/**
 * Prevents document scroll on /chat so only internal panes (thread, sidebars) scroll.
 */
export function ChatViewportLock({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);
  return <>{children}</>;
}
