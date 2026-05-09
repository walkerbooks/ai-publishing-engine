import type { FullBookPackageTier } from "@/lib/paypal/full-book-packages";

/** Remember which book was paid for before redirecting to PayPal (return page polls this book). */
export const PAYPAL_BOOK_STORAGE_KEY = "ai_pub_paypal_book_id";

/** After POST /subscriptions succeeds for a book, avoid duplicate rows on return-page refresh. */
export const subscriptionPostedStorageKey = (bookPublicId: string) =>
  `ai_pub_subscription_posted_${bookPublicId}`;

/**
 * After PayPal, a full page load clears client state. We stash the server conversation id
 * alongside the book so /chat?book=… can reload the same thread.
 */
export const PAYPAL_CHECKOUT_CONTEXT_KEY = "ai_pub_paypal_checkout_context";

export type PayPalCheckoutContextV1 = {
  v: 1;
  book_public_id: string;
  conversation_public_id: string | null;
  /** Which full-book package was chosen (maps to subscription_plan on the server). */
  package_tier?: FullBookPackageTier;
  include_cover?: boolean;
};

export function readPayPalCheckoutContext(): PayPalCheckoutContextV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PAYPAL_CHECKOUT_CONTEXT_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as unknown;
    if (
      typeof j !== "object" ||
      j === null ||
      (j as PayPalCheckoutContextV1).v !== 1
    ) {
      return null;
    }
    const book_public_id = (j as PayPalCheckoutContextV1).book_public_id;
    const conversation_public_id = (j as PayPalCheckoutContextV1)
      .conversation_public_id;
    if (typeof book_public_id !== "string" || !book_public_id.trim()) {
      return null;
    }
    if (
      conversation_public_id != null &&
      typeof conversation_public_id !== "string"
    ) {
      return null;
    }
    const rawTier = (j as PayPalCheckoutContextV1).package_tier;
    const package_tier =
      rawTier === "single" || rawTier === "double" || rawTier === "triple"
        ? rawTier
        : undefined;
    const rawCover = (j as PayPalCheckoutContextV1).include_cover;
    const include_cover = rawCover === true ? true : undefined;
    return {
      v: 1,
      book_public_id: book_public_id.trim(),
      conversation_public_id: conversation_public_id?.trim() || null,
      package_tier,
      include_cover,
    };
  } catch {
    return null;
  }
}

export function writePayPalCheckoutContext(
  ctx: PayPalCheckoutContextV1,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PAYPAL_CHECKOUT_CONTEXT_KEY, JSON.stringify(ctx));
  } catch {
    /* private mode */
  }
}

export function clearPayPalCheckoutContext(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PAYPAL_CHECKOUT_CONTEXT_KEY);
  } catch {
    /* */
  }
}
