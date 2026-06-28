"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserErrorBanner } from "@/components/ui/user-error-banner";
import { FullBookPackageCard } from "@/components/paypal/full-book-package-card";
import { cn } from "@/lib/utils/cn";
import type { MappedUserError } from "@/lib/errors/user-error-message";
import {
  FULL_BOOK_COVER_ADDON_LABEL,
  FULL_BOOK_PACKAGES,
  type FullBookPackageTier,
} from "@/lib/paypal/full-book-packages";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  error?: MappedUserError | null;
  onRetryPayment?: () => void;
  onDismissPayment?: () => void;
  onBuy: (tier: FullBookPackageTier, opts: { includeCover: boolean }) => void;
};

export function FullBookPricingDialog({
  open,
  onOpenChange,
  loading,
  error,
  onRetryPayment,
  onDismissPayment,
  onBuy,
}: Props) {
  const [includeCover, setIncludeCover] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setIncludeCover(false);
      }}
    >
      <DialogContent
        className={cn(
          "max-h-[min(92dvh,880px)] w-[calc(100vw-1rem)] max-w-6xl gap-0 overflow-y-auto p-4 sm:p-6",
        )}
      >
        <DialogHeader className="space-y-1 pb-4 text-left sm:pb-5">
          <DialogTitle className="text-xl font-semibold sm:text-2xl">
            Choose your package
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select a plan, then continue to PayPal for one payment for this book. Optional AI cover
            is included in the same checkout when selected below.
          </DialogDescription>
        </DialogHeader>

        <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-3 text-left text-sm dark:border-white/15 dark:bg-white/5">
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

        {error ? (
          <UserErrorBanner
            layout="polite"
            className="mb-4"
            message={error.message}
            tone={error.tone}
            retryable={error.retryable}
            onRetry={onRetryPayment}
            onDismiss={onDismissPayment}
            dismissLabel="Not now"
          />
        ) : null}

        <div className="grid grid-cols-1 items-start gap-5 pb-2 md:grid-cols-3 md:gap-4">
          {FULL_BOOK_PACKAGES.map((pkg) => (
            <FullBookPackageCard
              key={pkg.tier}
              pkg={pkg}
              ctaLabel="Buy now"
              loading={loading}
              disabled={loading}
              onCtaClick={() => onBuy(pkg.tier, { includeCover })}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
