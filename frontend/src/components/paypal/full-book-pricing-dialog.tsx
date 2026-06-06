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
  onBuy: (tier: FullBookPackageTier, opts: { includeCover: boolean }) => void;
};

const NAVY = "#2E2E5C";
const ORANGE = "#FFA500";
const PRICE_LAVENDER = "#C9B8E8";

export function FullBookPricingDialog({
  open,
  onOpenChange,
  loading,
  error,
  onRetryPayment,
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
            layout="inline"
            className="mb-4"
            message={error.message}
            tone={error.tone}
            retryable={error.retryable}
            onRetry={onRetryPayment}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-5 pb-2 md:grid-cols-3 md:gap-4">
          {FULL_BOOK_PACKAGES.map((pkg) => (
            <article
              key={pkg.tier}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md dark:border-white/10 dark:bg-zinc-950"
            >
              <div
                className="relative px-4 pb-10 pt-6 text-center"
                style={{ backgroundColor: NAVY }}
              >
                <h3 className="text-lg font-semibold tracking-tight text-white">
                  {pkg.name}
                </h3>
                <p
                  className="mt-3 text-4xl font-bold tabular-nums sm:text-[2.75rem]"
                  style={{ color: PRICE_LAVENDER }}
                >
                  {pkg.priceLabel}
                </p>
                <p
                  className="mt-1 text-sm font-semibold uppercase tracking-wide"
                  style={{ color: ORANGE }}
                >
                  {pkg.frequencyLabel}
                </p>
                <div
                  className="pointer-events-none absolute -bottom-px left-1/2 z-10 h-0 w-0 -translate-x-1/2 translate-y-[1px] border-x-[18px] border-t-[14px] border-x-transparent border-t-white dark:border-t-zinc-950"
                  aria-hidden
                />
              </div>

              <ul className="flex flex-1 flex-col divide-y divide-slate-200 bg-white px-1 py-0 text-center text-[13px] leading-snug text-slate-600 dark:divide-white/10 dark:bg-zinc-950 dark:text-zinc-300 sm:text-sm">
                {pkg.features.map((line) => (
                  <li key={line} className="px-3 py-2.5">
                    {line}
                  </li>
                ))}
              </ul>

              <div className="border-t border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => onBuy(pkg.tier, { includeCover })}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
                  )}
                  style={{ backgroundColor: ORANGE }}
                >
                  <span
                    className="h-0 w-0 shrink-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-white"
                    aria-hidden
                  />
                  {loading ? "Opening PayPal…" : "Buy now"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
