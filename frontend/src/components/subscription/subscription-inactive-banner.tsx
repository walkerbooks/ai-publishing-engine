"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchSubscriptionEntitlement,
  formatNextFullGenerationSlot,
  isLikelyNeverPurchasedEntitlement,
} from "@/lib/api/subscriptions-client";
import { getAccessToken } from "@/lib/auth/access-token";
import { useAuthStore } from "@/stores/auth-store";
import { UserErrorBanner } from "@/components/ui/user-error-banner";
import { cn } from "@/lib/utils/cn";

const DISMISS_NO_CREDITS = "ai_pub_subscription_notice_no_credits_dismissed";
const DISMISS_COOLDOWN = "ai_pub_subscription_notice_cooldown_dismissed";

type BannerMode = "hidden" | "no_credits" | "cooldown";

/**
 * Uses GET /subscriptions/entitlement: depleted credits vs 24h cooldown; skips the
 * no-credits strip when the user likely never purchased (same API flag as exhausted).
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
        if (isLikelyNeverPurchasedEntitlement(ent)) {
          setMode("hidden");
          setCooldownWhen(null);
          return;
        }
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
    : "You have used all full-book credits on your plan. Purchase a plan to generate another manuscript.";

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md sm:left-auto sm:right-4 sm:mx-0",
      )}
    >
      <UserErrorBanner
        layout="polite"
        tone="warning"
        title={showCooldown ? "Plan cooldown" : "No credits left"}
        message={body}
        onDismiss={close}
        dismissLabel="Not now"
        className="shadow-md"
      />
    </div>
  );
}
