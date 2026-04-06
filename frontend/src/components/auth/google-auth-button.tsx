"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

let gisLoadPromise: Promise<void> | null = null;

function ensureGisScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisLoadPromise) return gisLoadPromise;
  gisLoadPromise = new Promise((resolve, reject) => {
    const src = "https://accounts.google.com/gsi/client";
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      const done = () => resolve();
      if (window.google?.accounts?.id) {
        done();
        return;
      }
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Sign-In script failed")), {
        once: true,
      });
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Sign-In"));
    document.body.appendChild(s);
  });
  return gisLoadPromise;
}

export type GoogleAuthButtonProps = {
  /** Maps to Google button label (sign-in vs sign-up wording). */
  intent: "signin" | "signup";
  disabled?: boolean;
  className?: string;
  onCredential: (idToken: string) => void;
};

/**
 * Renders the official Google Sign In button (GIS). Requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
 * to match the Go API `GOOGLE_CLIENT_ID` used to verify tokens.
 */
export function GoogleAuthButton({ intent, disabled, className, onCredential }: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

  useEffect(() => {
    if (!clientId || !containerRef.current) return;

    const el = containerRef.current;
    let cancelled = false;

    void ensureGisScript()
      .then(() => {
        if (cancelled || !el.isConnected || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (res) => {
            if (res.credential) cbRef.current(res.credential);
          },
        });
        el.innerHTML = "";
        const w = el.offsetWidth > 0 ? el.offsetWidth : 320;
        window.google.accounts.id.renderButton(el, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: intent === "signup" ? "signup_with" : "signin_with",
          width: Math.min(Math.max(w, 240), 400),
          locale: "en",
        });
      })
      .catch(() => {
        /* parent can show error if needed */
      });

    return () => {
      cancelled = true;
      el.innerHTML = "";
    };
  }, [clientId, intent]);

  if (!clientId) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex min-h-[40px] w-full min-w-0 flex-col items-stretch justify-center [&>div]:!w-full [&>div]:justify-center",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <div ref={containerRef} className="w-full min-w-0" />
    </div>
  );
}
