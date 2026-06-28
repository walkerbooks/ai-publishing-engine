import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { FullBookPackage } from "@/lib/paypal/full-book-packages";

const NAVY = "#2E2E5C";
const ORANGE = "#FFA500";
const PRICE_LAVENDER = "#C9B8E8";

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
    "flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  );
  const ctaStyle = { backgroundColor: ORANGE };

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-md dark:bg-zinc-950",
        highlighted
          ? "border-walker-teal/60 shadow-lg shadow-walker-teal/10 ring-2 ring-walker-teal/35 dark:border-walker-teal/50"
          : "border-slate-200/90 dark:border-white/10",
      )}
    >
      {badge ? (
        <span
          className={cn(
            "absolute right-3 top-3 z-20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            "bg-walker-teal text-walker-charcoal shadow-sm",
          )}
        >
          {badge}
        </span>
      ) : null}

      <div
        className="relative px-4 pb-10 pt-6 text-center"
        style={{ backgroundColor: NAVY }}
      >
        <h3 className="text-lg font-semibold tracking-tight text-white">{pkg.name}</h3>
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

      <ul className="bg-white px-1 py-0 text-center text-[13px] leading-snug text-slate-600 dark:bg-zinc-950 dark:text-zinc-300 sm:text-sm">
        {pkg.features.map((line, i) => (
          <li
            key={line}
            className={cn(
              "px-3 py-2.5",
              i % 2 === 0
                ? "bg-white dark:bg-zinc-950"
                : "bg-slate-50 dark:bg-white/5",
            )}
          >
            {line}
          </li>
        ))}
      </ul>

      {pkg.bonusSections?.map((section) => (
        <div
          key={section.title}
          className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-center dark:border-white/10 dark:bg-white/5"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-walker-navy dark:text-walker-teal">
            {section.title}:
          </p>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-slate-600 dark:text-zinc-300 sm:text-sm">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {section.link ? (
            <p className="mt-2 text-[13px] leading-snug text-slate-600 dark:text-zinc-300 sm:text-sm">
              {section.link.prefix}
              <Link
                href={section.link.href}
                className="font-semibold text-walker-navy underline underline-offset-2 hover:text-walker-teal dark:text-walker-teal"
              >
                {section.link.label}
              </Link>
            </p>
          ) : null}
        </div>
      ))}

      <div className="border-t border-slate-100 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        {ctaHref ? (
          <Link
            href={ctaHref}
            className={ctaClassName}
            style={ctaStyle}
            aria-disabled={ctaDisabled}
          >
            <span
              className="h-0 w-0 shrink-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-white"
              aria-hidden
            />
            {resolvedCtaLabel}
          </Link>
        ) : (
          <button
            type="button"
            disabled={ctaDisabled}
            onClick={onCtaClick}
            className={ctaClassName}
            style={ctaStyle}
          >
            <span
              className="h-0 w-0 shrink-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-white"
              aria-hidden
            />
            {loading ? "Opening PayPal…" : resolvedCtaLabel}
          </button>
        )}
      </div>
    </article>
  );
}
