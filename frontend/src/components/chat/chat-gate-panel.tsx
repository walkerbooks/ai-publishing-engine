"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Props = {
  awaitingGate: null | "outline" | "preview" | "full";
  onProceedToOutline: () => void;
  onChangeRequirements: () => void;
  onProceedToPreview: () => void;
  onChangeOutline: () => void;
  onUnlockFull: () => void;
  onChangePreview: () => void;
  payPalLoading?: boolean;
  payPalError?: string | null;
};

export function ChatGatePanel({
  awaitingGate,
  onProceedToOutline,
  onChangeRequirements,
  onProceedToPreview,
  onChangeOutline,
  onUnlockFull,
  onChangePreview,
  payPalLoading,
  payPalError,
}: Props) {
  if (!awaitingGate) return null;

  const btnPrimary =
    "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-400 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 dark:focus-visible:ring-zinc-400";
  const btnGhost =
    "border border-slate-300 bg-transparent text-slate-800 hover:bg-slate-100 focus-visible:ring-slate-400 dark:border-white/20 dark:text-zinc-100 dark:hover:bg-white/10 dark:focus-visible:ring-zinc-500";

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-walker-night">
      {awaitingGate === "outline" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            onClick={onProceedToOutline}
            className={cn(btnPrimary)}
          >
            Proceed to outline
          </Button>
          <Button
            variant="outline"
            onClick={onChangeRequirements}
            className={cn(btnGhost)}
          >
            Change requirements
          </Button>
        </div>
      ) : null}

      {awaitingGate === "preview" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button onClick={onProceedToPreview} className={cn(btnPrimary)}>
            Proceed to preview
          </Button>
          <Button
            variant="outline"
            onClick={onChangeOutline}
            className={cn(btnGhost)}
          >
            Change outline
          </Button>
        </div>
      ) : null}

      {awaitingGate === "full" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {payPalError ? (
            <p className="w-full text-sm text-red-600" role="alert">
              {payPalError}
            </p>
          ) : null}
          <Button
            onClick={onUnlockFull}
            className={cn(btnPrimary)}
            disabled={payPalLoading}
          >
            {payPalLoading ? "Opening PayPal…" : "Pay with PayPal (full book)"}
          </Button>
          <Button
            variant="outline"
            onClick={onChangePreview}
            className={cn(btnGhost)}
          >
            Change preview
          </Button>
        </div>
      ) : null}
    </div>
  );
}
