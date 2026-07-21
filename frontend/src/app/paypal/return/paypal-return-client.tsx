"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getBook } from "@/lib/api/books-client";
import { capturePayPalOrder } from "@/lib/api/payments-client";
import {
  createSubscription,
  packageTierToSubscriptionPlan,
} from "@/lib/api/subscriptions-client";
import { getAccessToken } from "@/lib/auth/access-token";
import {
  PAYPAL_BOOK_STORAGE_KEY,
  readPayPalCheckoutContext,
  subscriptionPostedStorageKey,
} from "@/lib/paypal/checkout-session";
import { PayPalFlowCard } from "@/components/paypal/paypal-flow-card";
import { UserErrorBanner } from "@/components/ui/user-error-banner";
import { Button } from "@/components/ui/button";
import { getLogger } from "@/lib/log";
import { mapUserError } from "@/lib/errors/user-error-message";

const log = getLogger("paypal-return");

const PAID_LIKE = new Set(["paid", "generating", "complete"]);

function captureAttemptedKey(orderId: string) {
  return `ai_pub_paypal_capture_attempted_${orderId}`;
}

export function PayPalReturnClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderToken = (searchParams.get("token") ?? "").trim();
  const [message, setMessage] = useState("Confirming payment…");
  const [hardError, setHardError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const token = getAccessToken();
    let bookId: string | null = null;
    try {
      bookId = sessionStorage.getItem(PAYPAL_BOOK_STORAGE_KEY);
    } catch {
      /* */
    }
    const checkoutCtx = readPayPalCheckoutContext();
    if (!bookId && checkoutCtx?.book_public_id) {
      bookId = checkoutCtx.book_public_id;
    }

    if (!bookId) {
      log.warning("no book id after PayPal return");
      setHardError("No book context. Open your book from the app and try again.");
      setMessage("We couldn't confirm payment");
      return;
    }
    if (!token) {
      log.warning("no access token on PayPal return page");
      setHardError("Sign in to refresh your book status after PayPal.");
      setMessage("We couldn't confirm payment");
      return;
    }
    if (!orderToken) {
      log.warning("no PayPal order token on return URL");
      setHardError(
        "Missing PayPal order details. If you completed payment, open your book from chat — status may still update.",
      );
      setMessage("We couldn't confirm payment");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20;
    const id = bookId;

    const finishPaid = async (accessToken: string) => {
      try {
        sessionStorage.removeItem(PAYPAL_BOOK_STORAGE_KEY);
      } catch {
        /* */
      }
      const ctx = readPayPalCheckoutContext();
      const postedKey = subscriptionPostedStorageKey(id);
      let alreadyPosted = false;
      try {
        alreadyPosted = sessionStorage.getItem(postedKey) === "1";
      } catch {
        /* */
      }
      if (!alreadyPosted) {
        const plan = packageTierToSubscriptionPlan(ctx?.package_tier ?? "single");
        try {
          await createSubscription(plan, accessToken);
          try {
            sessionStorage.setItem(postedKey, "1");
          } catch {
            /* */
          }
        } catch (e) {
          log.warning("createSubscription after PayPal failed (non-blocking)", e);
        }
      }
      if (cancelled) return;
      const withCover = ctx?.include_cover ? "&with_cover=1" : "";
      router.replace(`/chat?book=${encodeURIComponent(id)}&paid=1${withCover}`);
    };

    const pollUntilPaid = async (accessToken: string) => {
      if (cancelled) return;
      attempts += 1;
      try {
        const book = await getBook(id, accessToken);
        if (PAID_LIKE.has(book.Status)) {
          log.debug("book paid-like; redirecting to chat", {
            bookId: id,
            status: book.Status,
          });
          await finishPaid(accessToken);
          return;
        }
      } catch {
        /* status may lag; retry */
      }
      if (cancelled) return;
      if (attempts >= maxAttempts) {
        log.warning("poll max attempts reached", { bookId: id, attempts: maxAttempts });
        setMessage("Still confirming");
        setHardError(
          "Payment can take a moment. Open your book page to see the latest status.",
        );
        return;
      }
      window.setTimeout(() => {
        void pollUntilPaid(accessToken);
      }, 1500);
    };

    const run = async () => {
      const attemptedKey = captureAttemptedKey(orderToken);
      let alreadyAttempted = false;
      try {
        alreadyAttempted = sessionStorage.getItem(attemptedKey) === "1";
      } catch {
        /* */
      }
      if (!alreadyAttempted) {
        setMessage("Capturing PayPal payment…");
        try {
          sessionStorage.setItem(attemptedKey, "1");
        } catch {
          /* */
        }
        try {
          await capturePayPalOrder(orderToken, token);
          log.debug("PayPal capture succeeded", { orderToken, bookId: id });
        } catch (e) {
          log.warning("PayPal capture failed; will poll book status", e);
          void mapUserError(e, "payment");
        }
      }
      if (cancelled) return;
      setMessage("Confirming payment…");
      await pollUntilPaid(token);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [orderToken, router]);

  const showSignInLink = mounted && !getAccessToken();
  const confirming =
    !hardError &&
    (message === "Confirming payment…" || message === "Capturing PayPal payment…");
  const isSlowConfirm = hardError?.startsWith("Payment can take a moment") ?? false;

  return (
    <PayPalFlowCard title="Payment status">
      {confirming ? (
        <div className="flex min-w-0 items-start gap-3">
          <Loader2
            className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-muted-foreground"
            aria-hidden
          />
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {message}
          </p>
        </div>
      ) : hardError ? (
        <UserErrorBanner
          layout="polite"
          tone={isSlowConfirm ? "warning" : "error"}
          title={isSlowConfirm ? "Still confirming" : "We couldn't confirm payment"}
          message={hardError}
          dismissLabel="Not now"
        />
      ) : (
        <p className="min-w-0 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {message}
        </p>
      )}

      <div className="flex min-w-0 flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
        {showSignInLink ? (
          <Button asChild className="h-11 w-full min-w-0 sm:h-9 sm:w-auto">
            <Link href={`/login?next=${encodeURIComponent("/paypal/return")}`}>Sign in</Link>
          </Button>
        ) : null}
        <Button variant="outline" asChild className="h-11 w-full min-w-0 sm:h-9 sm:w-auto">
          <Link href="/chat">Back to chat</Link>
        </Button>
      </div>
    </PayPalFlowCard>
  );
}
