"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";

/** Matches `AppHeader` (`h-14`). */
const HEADER_PX = 56;

function computeChatColumnHeight(): number {
  const vv = window.visualViewport;
  if (!vv) {
    return Math.max(240, window.innerHeight - HEADER_PX);
  }
  const raw = vv.height + vv.offsetTop - HEADER_PX;
  return Math.max(240, Math.min(window.innerHeight - HEADER_PX, raw));
}

/**
 * Pins /chat main column height to the visible viewport below the header so
 * mobile keyboards do not leave the thread/composer sized for the full layout viewport.
 */
export function ChatVisualViewportFrame({ children }: { children: ReactNode }) {
  const [heightPx, setHeightPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const vv = window.visualViewport;
    const update = () => setHeightPx(computeChatColumnHeight());

    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);

    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden overscroll-none bg-slate-100 text-slate-900 dark:bg-walker-night dark:text-zinc-100"
      style={
        heightPx != null
          ? { height: heightPx, maxHeight: heightPx, flex: "1 1 auto" }
          : undefined
      }
    >
      {children}
    </div>
  );
}
