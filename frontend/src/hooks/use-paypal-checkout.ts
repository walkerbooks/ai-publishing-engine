"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { createPayPalCheckout } from "@/lib/api/payments-client";
import { getAccessToken } from "@/lib/auth/access-token";
import { getLogger } from "@/lib/log";
import { PAYPAL_BOOK_STORAGE_KEY } from "@/lib/paypal/checkout-session";

const log = getLogger("use-paypal-checkout");

export function usePayPalCheckout() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(
    async (bookPublicId: string, loginRedirectPath?: string) => {
      setError(null);
      const token = getAccessToken();
      if (!token) {
        log.debug("checkout: no access token; redirecting to login");
        const next =
          loginRedirectPath ??
          (typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/chat");
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      setLoading(true);
      try {
        const { checkout_url } = await createPayPalCheckout(bookPublicId, token);
        try {
          sessionStorage.setItem(PAYPAL_BOOK_STORAGE_KEY, bookPublicId);
        } catch {
          /* private mode */
        }
        log.debug("checkout: redirecting to PayPal", { bookPublicId });
        window.location.href = checkout_url;
      } catch (e) {
        log.warning("checkout failed", e);
        setError(e instanceof Error ? e.message : "Checkout failed");
        setLoading(false);
      }
    },
    [router],
  );

  return { startCheckout, loading, error, clearError: () => setError(null) };
}
