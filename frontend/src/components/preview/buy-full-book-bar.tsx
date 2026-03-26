"use client";

import { Button } from "@/components/ui/button";

type Props = { onCheckout: () => void };

export function BuyFullBookBar({ onCheckout }: Props) {
  return (
    <div className="mt-8 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-lg font-semibold text-slate-900">Buy full book</h2>
      <p className="text-sm text-slate-600">
        Stripe checkout will open here when the Go backend is connected.
      </p>
      <Button type="button" className="w-full sm:w-auto" onClick={onCheckout}>
        Buy full book
      </Button>
    </div>
  );
}
