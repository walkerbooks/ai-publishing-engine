"use client";

import { Button } from "@/components/ui/button";
import { UserErrorBanner } from "@/components/ui/user-error-banner";
import type { MappedUserError } from "@/lib/errors/user-error-message";

type Props = {
  onCheckout: () => void;
  loading?: boolean;
  error?: MappedUserError | null;
  onRetryCheckout?: () => void;
};

export function BuyFullBookBar({ onCheckout, loading, error, onRetryCheckout }: Props) {
  return (
    <div className="mt-8 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-lg font-semibold text-slate-900">Buy full book</h2>
      <p className="text-sm text-slate-600">
        Pay with PayPal. You need to be signed in; the book ID must match a book on the server
        in <span className="font-medium">preview_ready</span> or{" "}
        <span className="font-medium">awaiting_payment</span> status.
      </p>
      {error ? (
        <UserErrorBanner
          layout="inline"
          message={error.message}
          tone={error.tone}
          retryable={error.retryable}
          onRetry={onRetryCheckout}
        />
      ) : null}
      <Button
        type="button"
        className="w-full sm:w-auto"
        onClick={onCheckout}
        disabled={loading}
      >
        {loading ? "Opening PayPal…" : "Buy full book"}
      </Button>
    </div>
  );
}
