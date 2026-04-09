import type { FullBookPackageTier } from "@/lib/paypal/full-book-packages";
import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { throwIfGoResponseFailed } from "@/lib/api/go-response";
import { getLogger } from "@/lib/log";

const log = getLogger("subscriptions-client");

export type SubscriptionPlan = "single_book" | "double_book" | "triple_book";

export type SubscriptionRow = {
  public_id: string;
  user_id: number;
  plan: SubscriptionPlan;
  expired: boolean;
  books_remaining: number;
  last_full_generation_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SubscriptionEntitlement = {
  has_entitlement: boolean;
  can_start_full_generation: boolean;
  books_remaining: number;
  plan: string;
  subscription_public_id: string;
  next_full_generation_after: string | null;
  multi_book_cooldown_seconds: number;
};

const SUBSCRIPTIONS_BASE = `${GO_API_PREFIX}/v1/subscriptions`;

export function packageTierToSubscriptionPlan(
  tier: FullBookPackageTier,
): SubscriptionPlan {
  const m: Record<FullBookPackageTier, SubscriptionPlan> = {
    single: "single_book",
    double: "double_book",
    triple: "triple_book",
  };
  return m[tier];
}

export function formatNextFullGenerationSlot(
  iso: string | null | undefined,
): string {
  if (!iso?.trim()) return "when the cooldown ends";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "when the cooldown ends";
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "when the cooldown ends";
  }
}

/**
 * Preflight before POST full-book generation. On API failure, allows the request
 * (server remains authoritative).
 */
export async function checkFullGenerationEntitlement(
  accessToken: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const ent = await fetchSubscriptionEntitlement(accessToken);
    if (!ent.has_entitlement) {
      return {
        ok: false,
        message:
          "You have no full-book credits left. Purchase a plan to generate another manuscript.",
      };
    }
    if (!ent.can_start_full_generation) {
      const when = formatNextFullGenerationSlot(ent.next_full_generation_after);
      return {
        ok: false,
        message: `Your plan allows one full book every 24 hours. Next slot: ${when}.`,
      };
    }
    return { ok: true };
  } catch (e) {
    log.warning(
      "entitlement preflight failed; allowing full generation request",
      e,
    );
    return { ok: true };
  }
}

export async function createSubscription(
  plan: SubscriptionPlan,
  accessToken: string,
): Promise<{ subscription: SubscriptionRow }> {
  const res = await fetch(SUBSCRIPTIONS_BASE, {
    method: "POST",
    headers: {
      ...goAuthHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) {
    log.warning(`createSubscription failed: HTTP ${res.status}`);
    await throwIfGoResponseFailed(res);
  }
  log.debug("createSubscription succeeded", { plan });
  return res.json() as Promise<{ subscription: SubscriptionRow }>;
}

export async function listSubscriptions(
  accessToken: string,
): Promise<{ subscriptions: SubscriptionRow[] }> {
  const res = await fetch(SUBSCRIPTIONS_BASE, {
    method: "GET",
    headers: goAuthHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok) {
    log.warning(`listSubscriptions failed: HTTP ${res.status}`);
    await throwIfGoResponseFailed(res);
  }
  return res.json() as Promise<{ subscriptions: SubscriptionRow[] }>;
}

export async function fetchActiveSubscriptionCheck(
  accessToken: string,
): Promise<{ has_active_subscription: boolean }> {
  const res = await fetch(`${SUBSCRIPTIONS_BASE}/active-check`, {
    method: "GET",
    headers: goAuthHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok) {
    log.warning(`active-check failed: HTTP ${res.status}`);
    await throwIfGoResponseFailed(res);
  }
  return res.json() as Promise<{ has_active_subscription: boolean }>;
}

export async function fetchSubscriptionEntitlement(
  accessToken: string,
): Promise<SubscriptionEntitlement> {
  const res = await fetch(`${SUBSCRIPTIONS_BASE}/entitlement`, {
    method: "GET",
    headers: goAuthHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok) {
    log.warning(`entitlement failed: HTTP ${res.status}`);
    await throwIfGoResponseFailed(res);
  }
  return res.json() as Promise<SubscriptionEntitlement>;
}
