"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FullBookPackageCard } from "@/components/paypal/full-book-package-card";
import { PayPalFlowCard } from "@/components/paypal/paypal-flow-card";
import { Button } from "@/components/ui/button";
import { UserErrorBanner } from "@/components/ui/user-error-banner";
import { usePayPalCheckout } from "@/hooks/use-paypal-checkout";
import { getAccessToken } from "@/lib/auth/access-token";
import {
  FULL_BOOK_COVER_ADDON_LABEL,
  FULL_BOOK_PACKAGES,
  type FullBookPackageTier,
} from "@/lib/paypal/full-book-packages";

export function PayPalCheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookId = (searchParams.get("book") ?? "").trim();
  const [includeCover, setIncludeCover] = useState(false);
  const {
    startCheckout,
    retryCheckout,
    loading,
    error,
    clearError,
  } = usePayPalCheckout();

  const signedIn = useMemo(() => Boolean(getAccessToken()), []);

  const onBuy = (tier: FullBookPackageTier) => {
    clearError();
    if (!bookId) return;
    if (!getAccessToken()) {
      router.push(
        `/login?next=${encodeURIComponent(`/paypal/checkout?book=${encodeURIComponent(bookId)}`)}`,
      );
      return;
    }
    void startCheckout(bookId, `/paypal/checkout?book=${bookId}`, tier, includeCover);
  };

  if (!bookId) {
    return (
      <PayPalFlowCard title="Choose a package">
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Open checkout from your book chat after the preview is ready so we know which book to
          unlock.
        </p>
        <Button asChild className="h-11 w-full sm:h-9 sm:w-auto">
          <Link href="/chat">Back to chat</Link>
        </Button>
      </PayPalFlowCard>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:pb-12 sm:pt-12">
      <div className="mb-6 space-y-2 sm:mb-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          WalkerBook · PayPal checkout
        </p>
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Choose your package
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Select a plan, optionally add AI cover art, then continue to PayPal. You will return here
          after payment to unlock full book generation.
        </p>
      </div>

      {!signedIn ? (
        <UserErrorBanner
          layout="polite"
          tone="warning"
          className="mb-4"
          title="Sign in required"
          message="You need to be signed in before paying with PayPal."
        />
      ) : null}

      {error ? (
        <UserErrorBanner
          layout="polite"
          className="mb-4"
          message={error.message}
          tone={error.tone}
          retryable={error.retryable}
          onRetry={error.retryable ? () => retryCheckout() : undefined}
          onDismiss={clearError}
          dismissLabel="Not now"
        />
      ) : null}

      <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-3 text-left text-sm dark:border-white/15 dark:bg-white/5">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-walker-teal focus:ring-walker-teal"
          checked={includeCover}
          disabled={loading}
          onChange={(e) => setIncludeCover(e.target.checked)}
        />
        <span className="leading-snug text-slate-800 dark:text-zinc-100">
          {FULL_BOOK_COVER_ADDON_LABEL}
        </span>
      </label>

      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-3 md:gap-4">
        {FULL_BOOK_PACKAGES.map((pkg) => (
          <FullBookPackageCard
            key={pkg.tier}
            pkg={pkg}
            loading={loading}
            disabled={loading}
            onCtaClick={() => onBuy(pkg.tier)}
            ctaLabel={loading ? "Opening PayPal…" : "Pay with PayPal"}
          />
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button variant="outline" asChild className="h-11 w-full sm:h-9 sm:w-auto">
          <Link href={`/chat?book=${encodeURIComponent(bookId)}`}>Back to chat</Link>
        </Button>
        {!signedIn ? (
          <Button asChild className="h-11 w-full sm:h-9 sm:w-auto">
            <Link
              href={`/login?next=${encodeURIComponent(`/paypal/checkout?book=${encodeURIComponent(bookId)}`)}`}
            >
              Sign in
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
