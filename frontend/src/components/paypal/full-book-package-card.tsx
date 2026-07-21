import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { FullBookPackage } from "@/lib/paypal/full-book-packages";

type Props = {
  pkg: FullBookPackage;
  ctaLabel?: string;
  onCtaClick?: () => void;
  ctaHref?: string;
  loading?: boolean;
  disabled?: boolean;
  highlighted?: boolean;
  badge?: string;
};

export function FullBookPackageCard({
  pkg,
  ctaLabel,
  onCtaClick,
  ctaHref,
  loading = false,
  disabled = false,
  highlighted = false,
  badge,
}: Props) {
  const resolvedCtaLabel = ctaLabel ?? pkg.ctaLabel;
  const ctaDisabled = disabled || loading;

  const ctaClassName = cn(
    "flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-walker-teal focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-60",
    highlighted
      ? "bg-white text-walker-charcoal hover:bg-walker-mist focus-visible:ring-offset-walker-night"
      : "bg-walker-charcoal text-white hover:bg-walker-navy focus-visible:ring-offset-walker-mist dark:bg-walker-mist dark:text-walker-charcoal dark:hover:bg-white",
  );

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-3xl p-5 sm:p-7",
        highlighted
          ? "bg-walker-night text-walker-mist shadow-xl shadow-walker-navy/25 ring-1 ring-white/10 md:-mt-3 md:mb-0 md:pb-8"
          : "border border-border bg-walker-mist/70 text-walker-charcoal dark:border-white/10 dark:bg-walker-nightPanel/80 dark:text-walker-mist",
      )}
    >
      {badge ? (
        <span
          className={cn(
            "absolute left-1/2 top-0 z-10 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5",
            "rounded-full bg-walker-charcoal px-3 py-1 text-xs font-medium text-white shadow-md",
            "ring-1 ring-white/15",
          )}
        >
          <Check className="h-3.5 w-3.5 text-walker-teal" strokeWidth={2.5} aria-hidden />
          {badge}
        </span>
      ) : null}

      <div className={cn(badge ? "pt-2" : undefined)}>
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.18em]",
            highlighted ? "text-walker-slate" : "text-muted-foreground",
          )}
        >
          {pkg.eyebrow}
        </p>
        <h3
          className={cn(
            "mt-2 text-2xl font-semibold tracking-tight",
            highlighted ? "text-white" : "text-walker-charcoal dark:text-walker-mist",
          )}
        >
          {pkg.name}
        </h3>
        <p
          className={cn(
            "mt-3 text-sm leading-relaxed",
            highlighted ? "text-walker-mist/75" : "text-muted-foreground",
          )}
        >
          {pkg.description}
        </p>
      </div>

      <p
        className={cn(
          "mt-6 text-[1.75rem] font-semibold tracking-tight tabular-nums sm:text-[2rem]",
          highlighted ? "text-white" : "text-walker-charcoal dark:text-walker-mist",
        )}
      >
        {pkg.priceLabel}
        <span
          className={cn(
            "text-base font-medium",
            highlighted ? "text-walker-mist/65" : "text-muted-foreground",
          )}
        >
          {" "}
          / {pkg.frequencyLabel}
        </span>
      </p>

      <div className="mt-5">
        {ctaHref ? (
          <Link
            href={ctaHref}
            className={ctaClassName}
            aria-disabled={ctaDisabled}
            tabIndex={ctaDisabled ? -1 : undefined}
          >
            {resolvedCtaLabel}
          </Link>
        ) : (
          <button
            type="button"
            disabled={ctaDisabled}
            onClick={onCtaClick}
            className={ctaClassName}
          >
            {loading ? "Opening PayPal…" : resolvedCtaLabel}
          </button>
        )}
      </div>

      <div className="mt-7 flex-1">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.18em]",
            highlighted ? "text-walker-slate" : "text-muted-foreground",
          )}
        >
          What&apos;s included
        </p>
        <ul className="mt-4 space-y-2.5">
          {pkg.features.map((line) => (
            <li key={line} className="flex gap-2.5 text-sm leading-snug">
              <Check
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  highlighted ? "text-walker-teal" : "text-walker-navy dark:text-walker-teal",
                )}
                strokeWidth={2.25}
                aria-hidden
              />
              <span className={highlighted ? "text-walker-mist/85" : "text-foreground/85"}>
                {line}
              </span>
            </li>
          ))}
        </ul>

        {pkg.bonusSections?.map((section) => (
          <div key={section.title} className="mt-5">
            <p
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.18em]",
                highlighted ? "text-walker-teal" : "text-walker-navy dark:text-walker-teal",
              )}
            >
              {section.title}
            </p>
            <ul className="mt-3 space-y-2.5">
              {section.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-snug">
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      highlighted ? "text-walker-teal" : "text-walker-navy dark:text-walker-teal",
                    )}
                    strokeWidth={2.25}
                    aria-hidden
                  />
                  <span className={highlighted ? "text-walker-mist/85" : "text-foreground/85"}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            {section.link ? (
              <p
                className={cn(
                  "mt-2 pl-[26px] text-sm leading-snug",
                  highlighted ? "text-walker-mist/75" : "text-muted-foreground",
                )}
              >
                {section.link.prefix}
                <Link
                  href={section.link.href}
                  className={cn(
                    "font-semibold underline underline-offset-2",
                    highlighted
                      ? "text-walker-teal hover:text-white"
                      : "text-walker-navy hover:text-walker-teal dark:text-walker-teal",
                  )}
                >
                  {section.link.label}
                </Link>
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </article>
  );
}
