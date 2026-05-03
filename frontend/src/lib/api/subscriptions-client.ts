import type { FullBookPackageTier } from "@/lib/paypal/full-book-packages";
import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { throwIfGoResponseFailed } from "@/lib/api/go-response";
import { getLogger } from "@/lib/log";

const log = getLogger("subscriptions-client");

/** When true, UI + preflight ignore 24h cooldown if the user still has subscription credits. Go may still enforce on POST /full-book/request. */
const FULL_BOOK_COOLDOWN_BYPASS =
  process.env.NEXT_PUBLIC_FULL_BOOK_COOLDOWN_BYPASS === "true";

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

const _ZERO_UUID = "00000000-0000-0000-0000-000000000000";

function _pick(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (k in raw && raw[k] !== undefined && raw[k] !== null) return raw[k];
  }
  return undefined;
}

function _asBool(v: unknown): boolean | undefined {
  if (v === true || v === false) return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

function _asInt(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return undefined;
}

/**
 * Go may emit JSON with PascalCase keys; normalize to the snake_case shape the UI expects.
 * If ``books_remaining`` &gt; 0 but ``has_entitlement`` is missing/false, treat as entitled
 * (some API versions only expose the counter reliably).
 */
export function normalizeSubscriptionEntitlement(raw: unknown): SubscriptionEntitlement {
  if (!raw || typeof raw !== "object") {
    return {
      has_entitlement: false,
      can_start_full_generation: false,
      books_remaining: 0,
      plan: "",
      subscription_public_id: "",
      next_full_generation_after: null,
      multi_book_cooldown_seconds: 0,
    };
  }
  const r = raw as Record<string, unknown>;
  let has_entitlement =
    _asBool(
      _pick(r, "has_entitlement", "HasEntitlement", "hasEntitlement"),
    ) ?? false;
  let can_start_full_generation =
    _asBool(
      _pick(
        r,
        "can_start_full_generation",
        "CanStartFullGeneration",
        "canStartFullGeneration",
      ),
    ) ?? false;
  const books_remaining =
    _asInt(_pick(r, "books_remaining", "BooksRemaining", "booksRemaining")) ?? 0;
  if (!has_entitlement && books_remaining > 0) {
    has_entitlement = true;
  }
  if (
    FULL_BOOK_COOLDOWN_BYPASS &&
    has_entitlement &&
    !can_start_full_generation
  ) {
    can_start_full_generation = true;
  }
  const plan = String(_pick(r, "plan", "Plan") ?? "");
  const subscription_public_id = String(
    _pick(
      r,
      "subscription_public_id",
      "SubscriptionPublicId",
      "subscriptionPublicId",
    ) ?? "",
  );
  const next_raw = _pick(
    r,
    "next_full_generation_after",
    "NextFullGenerationAfter",
    "nextFullGenerationAfter",
  );
  const next_full_generation_after =
    next_raw == null || next_raw === "" ? null : String(next_raw);
  const multi_book_cooldown_seconds =
    _asInt(
      _pick(
        r,
        "multi_book_cooldown_seconds",
        "MultiBookCooldownSeconds",
        "multiBookCooldownSeconds",
      ),
    ) ?? 0;

  return {
    has_entitlement,
    can_start_full_generation,
    books_remaining,
    plan,
    subscription_public_id,
    next_full_generation_after,
    multi_book_cooldown_seconds,
  };
}

/**
 * Distinguishes "never bought a plan" from "had credits, used them" for UI copy.
 * Same `has_entitlement: false` is returned in both cases; use this for messaging only.
 */
export function isLikelyNeverPurchasedEntitlement(
  ent: SubscriptionEntitlement,
): boolean {
  const sid = (ent.subscription_public_id ?? "").trim();
  const pl = (ent.plan ?? "").trim();
  if (!pl) return true;
  if (!sid || sid === _ZERO_UUID) return true;
  return false;
}

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
  const raw: unknown = await res.json();
  return normalizeSubscriptionEntitlement(raw);
}
