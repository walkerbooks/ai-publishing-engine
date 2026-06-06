"use client";

import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Props = {
  message: string;
  tone?: "error" | "warning";
  title?: string;
  retryable?: boolean;
  retryLabel?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
  /** `banner` = full-width strip; `inline` = rounded card; `polite` = soft inset card for chat */
  layout?: "banner" | "inline" | "polite";
};

export function UserErrorBanner({
  message,
  tone = "error",
  title,
  retryable = false,
  retryLabel = "Try again",
  onRetry,
  onDismiss,
  dismissLabel = "Dismiss",
  className,
  layout = "banner",
}: Props) {
  const isWarning = tone === "warning";
  const isPolite = layout === "polite";
  const Icon = isWarning ? Info : AlertTriangle;
  const showRetry = retryable && onRetry;
  const politeTitle =
    title ??
    (isPolite ? (isWarning ? "Heads up" : "Something didn't go through") : undefined);

  return (
    <div
      role={isWarning ? "status" : "alert"}
      className={cn(
        layout === "polite"
          ? "flex flex-col gap-3 rounded-2xl border px-4 py-3.5 shadow-sm sm:flex-row sm:items-start sm:gap-4"
          : layout === "banner"
            ? "flex shrink-0 items-start gap-3 border-b px-4 py-3 sm:items-center sm:py-2.5"
            : "flex items-start gap-3 rounded-xl border px-3 py-3 sm:items-center",
        isWarning
          ? layout === "polite"
            ? "border-amber-200/80 bg-amber-50/90 text-amber-950 dark:border-amber-500/20 dark:bg-amber-950/25 dark:text-amber-50"
            : layout === "banner"
              ? "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-50"
              : "border-amber-500/35 bg-amber-500/10 text-amber-950 dark:border-amber-500/25 dark:text-amber-50"
          : layout === "polite"
            ? "border-slate-200/90 bg-white/95 text-slate-800 dark:border-white/10 dark:bg-walker-nightPanel/95 dark:text-zinc-100"
            : layout === "banner"
              ? "border-red-500/25 bg-red-950/35 text-red-100 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-100"
              : "border-red-500/30 bg-red-500/10 text-red-900 dark:border-red-500/25 dark:bg-red-950/40 dark:text-red-100",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            isPolite
              ? isWarning
                ? "text-amber-600 dark:text-amber-300"
                : "text-walker-teal dark:text-walker-teal"
              : isWarning
                ? "text-amber-700 dark:text-amber-200"
                : "text-red-400",
            !isPolite && "sm:mt-0",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1">
          {politeTitle ? (
            <p
              className={cn(
                "text-sm font-medium leading-snug",
                isPolite ? "text-slate-900 dark:text-zinc-50" : "font-semibold",
              )}
            >
              {politeTitle}
            </p>
          ) : null}
          <p
            className={cn(
              "text-pretty leading-relaxed",
              isPolite ? "text-sm text-slate-600 dark:text-zinc-300" : "text-sm",
            )}
          >
            {message}
          </p>
        </div>
      </div>
      {showRetry || onDismiss ? (
        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center gap-2",
            isPolite ? "sm:pt-0.5" : "flex-col sm:flex-row sm:items-center",
          )}
        >
          {showRetry ? (
            <Button
              type="button"
              size="sm"
              variant={isPolite ? "outline" : layout === "inline" ? "outline" : "ghost"}
              className={cn(
                "h-9 min-w-[5.5rem] touch-manipulation",
                isPolite &&
                  "border-walker-teal/40 text-walker-teal hover:bg-walker-teal/10 dark:border-walker-teal/50 dark:text-walker-teal dark:hover:bg-walker-teal/15",
                layout === "banner" &&
                  !isWarning &&
                  !isPolite &&
                  "text-red-100 hover:bg-red-900/40 hover:text-white dark:hover:bg-red-900/60",
                layout === "banner" &&
                  isWarning &&
                  !isPolite &&
                  "text-amber-950 hover:bg-amber-500/20 dark:text-amber-50 dark:hover:bg-amber-500/15",
              )}
              onClick={onRetry}
            >
              {retryLabel}
            </Button>
          ) : null}
          {onDismiss ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(
                "h-9 touch-manipulation",
                isPolite
                  ? "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  : isWarning
                    ? "text-amber-900 dark:text-amber-100"
                    : layout === "banner"
                      ? "text-red-200 hover:text-white"
                      : "text-red-700 dark:text-red-200",
              )}
              onClick={onDismiss}
            >
              {dismissLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
