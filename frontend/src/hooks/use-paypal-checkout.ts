"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { requestFullGeneration } from "@/lib/api/books-client";
import { createPayPalCheckout } from "@/lib/api/payments-client";
import {
  createSubscription,
  packageTierToSubscriptionPlan,
} from "@/lib/api/subscriptions-client";
import { promoteActiveGuestConversationToServer } from "@/lib/chat/conversation-sync";
import { getAccessToken } from "@/lib/auth/access-token";
import { mapUserError, type MappedUserError } from "@/lib/errors/user-error-message";
import { getLogger } from "@/lib/log";
import type { FullBookPackageTier } from "@/lib/paypal/full-book-packages";
import {
  PAYPAL_BOOK_STORAGE_KEY,
  writePayPalCheckoutContext,
} from "@/lib/paypal/checkout-session";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { usePublishingStore } from "@/stores/publishing-store";

const log = getLogger("use-paypal-checkout");
const PAYPAL_BYPASS = process.env.NEXT_PUBLIC_PAYPAL_BYPASS === "true";

type CheckoutParams = {
  bookPublicId: string;
  loginRedirectPath?: string;
  packageTier: FullBookPackageTier;
  includeCover: boolean;
};

export function usePayPalCheckout() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<MappedUserError | null>(null);
  const lastCheckoutRef = useRef<CheckoutParams | null>(null);

  const startCheckout = useCallback(
    async (
      bookPublicId: string,
      loginRedirectPath?: string,
      packageTier: FullBookPackageTier = "single",
      includeCover = false,
    ) => {
      const params: CheckoutParams = {
        bookPublicId,
        loginRedirectPath,
        packageTier,
        includeCover,
      };
      lastCheckoutRef.current = params;
      setError(null);
      if (PAYPAL_BYPASS) {
        const token = getAccessToken();
        if (token) {
          const plan = packageTierToSubscriptionPlan(packageTier);
          try {
            await createSubscription(plan, token);
            log.debug("PayPal bypass: createSubscription succeeded", { plan });
          } catch (e) {
            log.warning(
              "PayPal bypass: createSubscription failed (continuing if you already have credits)",
              e,
            );
          }
          if (includeCover) {
            usePublishingStore.getState().setMockPayment(true);
            usePublishingStore.getState().setPostPayCoverFlowActive(true);
            usePublishingStore.getState().setPostPayFrontMatterLocked(false);
            router.push(
              `/chat?book=${encodeURIComponent(bookPublicId)}&paid=1&with_cover=1`,
            );
            return;
          }
          try {
            await requestFullGeneration(bookPublicId, token);
          } catch (e) {
            log.warning("PayPal bypass: requestFullGeneration failed", e);
            setError(mapUserError(e, "payment"));
            return;
          }
        }
        usePublishingStore.getState().setMockPayment(true);
        if (typeof window !== "undefined" && window.location.pathname !== "/chat") {
          router.push("/chat");
        }
        return;
      }
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
        await promoteActiveGuestConversationToServer();
        const convId = useChatDirectoryStore.getState().activeConversationId;
        writePayPalCheckoutContext({
          v: 1,
          book_public_id: bookPublicId,
          conversation_public_id: convId,
          package_tier: packageTier,
          include_cover: includeCover ? true : undefined,
        });
        const { checkout_url } = await createPayPalCheckout(bookPublicId, token, {
          packageTier,
          includeCover,
        });
        try {
          sessionStorage.setItem(PAYPAL_BOOK_STORAGE_KEY, bookPublicId);
        } catch {
          /* private mode */
        }
        log.debug("checkout: redirecting to PayPal", { bookPublicId });
        window.location.href = checkout_url;
      } catch (e) {
        log.warning("checkout failed", e);
        setError(mapUserError(e, "payment"));
        setLoading(false);
      }
    },
    [router],
  );

  const retryCheckout = useCallback(() => {
    const p = lastCheckoutRef.current;
    if (!p) return;
    void startCheckout(
      p.bookPublicId,
      p.loginRedirectPath,
      p.packageTier,
      p.includeCover,
    );
  }, [startCheckout]);

  return {
    startCheckout,
    retryCheckout,
    loading,
    error,
    clearError: () => setError(null),
  };
}
