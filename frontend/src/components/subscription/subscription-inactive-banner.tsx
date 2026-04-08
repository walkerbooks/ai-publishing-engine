"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  fetchSubscriptionEntitlement,
  formatNextFullGenerationSlot,
} from "@/lib/api/subscriptions-client";
import { getAccessToken } from "@/lib/auth/access-token";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const DISMISS_NO_CREDITS = "ai_pub_subscription_notice_no_credits_dismissed";
const DISMISS_COOLDOWN = "ai_pub_subscription_notice_cooldown_dismissed";

type BannerMode = "hidden" | "no_credits" | "cooldown";

/**
 * Uses GET /subscriptions/entitlement: no credits vs 24h cooldown for multi-book plans.
 * Dismissal is per-notice kind, tab session only (sessionStorage).
 */
export function SubscriptionInactiveBanner() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [hydrated, setHydrated] = useState(false);
  const [dismissedNoCredits, setDismissedNoCredits] = useState(false);
  const [dismissedCooldown, setDismissedCooldown] = useState(false);
  const [mode, setMode] = useState<BannerMode>("hidden");
  const [cooldownWhen, setCooldownWhen] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_NO_CREDITS) === "1") {
        setDismissedNoCredits(true);
      }
      if (sessionStorage.getItem(DISMISS_COOLDOWN) === "1") {
        setDismissedCooldown(true);
      }
    } catch {
      /* */
    }
    setHydrated(true);
  }, []);

  const runCheck = useCallback(async () => {
    if (!isAuthenticated || !hydrated) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      const ent = await fetchSubscriptionEntitlement(token);
      if (!ent.has_entitlement) {
        setMode("no_credits");
        setCooldownWhen(null);
        return;
      }
      if (!ent.can_start_full_generation) {
        setMode("cooldown");
        setCooldownWhen(ent.next_full_generation_after);
        return;
      }
      setMode("hidden");
      setCooldownWhen(null);
    } catch {
      setMode("hidden");
      setCooldownWhen(null);
    }
  }, [isAuthenticated, hydrated]);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  useEffect(() => {
    if (!isAuthenticated || !hydrated) return;
    const onVis = () => {
      if (document.visibilityState === "visible") void runCheck();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isAuthenticated, hydrated, runCheck]);

  const close = () => {
    if (mode === "no_credits") {
      setDismissedNoCredits(true);
      try {
        sessionStorage.setItem(DISMISS_NO_CREDITS, "1");
      } catch {
        /* */
      }
    } else if (mode === "cooldown") {
      setDismissedCooldown(true);
      try {
        sessionStorage.setItem(DISMISS_COOLDOWN, "1");
      } catch {
        /* */
      }
    }
    setMode("hidden");
  };

  const showNoCredits = mode === "no_credits" && !dismissedNoCredits;
  const showCooldown = mode === "cooldown" && !dismissedCooldown;
  const visible = showNoCredits || showCooldown;

  if (!hydrated || !visible) return null;

  const body = showCooldown
    ? `Your plan allows one full book every 24 hours. Next slot: ${formatNextFullGenerationSlot(cooldownWhen)}.`
    : "You have used your subscription plan.";

  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 shadow-md dark:border-amber-900/60 dark:bg-amber-950/90 dark:text-amber-50 sm:left-auto sm:right-4 sm:mx-0",
      )}
    >
      <p className="min-w-0 flex-1 leading-snug pt-0.5">{body}</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 shrink-0 p-0 text-amber-900 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900/50"
        onClick={close}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
