"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";

/** Fallback when `main` is not found (SSR / edge). ~AppHeader + gradient strip. */
const TOP_INSET_FALLBACK_PX = 58;

function topInsetBelowLayoutChromePx(): number {
  const main = document.querySelector("main");
  if (!main) return TOP_INSET_FALLBACK_PX;
  return Math.max(0, Math.round(main.getBoundingClientRect().top));
}

function computeChatColumnHeight(): number {
  const topInset = topInsetBelowLayoutChromePx();
  const vv = window.visualViewport;
  if (!vv) {
    return Math.max(240, window.innerHeight - topInset);
  }
  const raw = vv.height + vv.offsetTop - topInset;
  return Math.max(240, Math.min(window.innerHeight - topInset, raw));
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
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden overscroll-none bg-[linear-gradient(135deg,#ffffff_0%,#f6faf8_32%,#d0ebe0_72%,#a8dcc8_100%)] text-slate-900 dark:bg-walker-night dark:[background-image:none] dark:text-zinc-100"
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
