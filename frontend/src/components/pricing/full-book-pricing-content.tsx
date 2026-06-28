import { FullBookPackageCard } from "@/components/paypal/full-book-package-card";
import { FULL_BOOK_PACKAGES } from "@/lib/paypal/full-book-packages";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FullBookPackageCard } from "@/components/paypal/full-book-package-card";
import {
  FULL_BOOK_COVER_ADDON_LABEL,
  FULL_BOOK_PACKAGES,
} from "@/lib/paypal/full-book-packages";
import { cn } from "@/lib/utils/cn";

const HIGHLIGHTED_TIER = "triple" as const;

type Props = {
  headingLevel?: "h1" | "h2";
  headingId?: string;
};

export function FullBookPricingContent({
  headingLevel = "h2",
  headingId = "pricing-heading",
}: Props) {
  const Heading = headingLevel;

  return (
    <>
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-walker-teal dark:text-walker-teal">
          Pricing
        </p>
        <Heading
          id={headingId}
          className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Choose the plan that fits your publishing goals
        </Heading>
      </div>

      <div className="mt-10 grid grid-cols-1 items-start gap-5 sm:mt-12 md:grid-cols-3 md:gap-4 lg:gap-5">
          One payment. A book you can publish.
        </Heading>
        <p className="mt-3 text-pretty text-muted-foreground">
          Start free in chat — outline and preview your voice first. When you&apos;re ready for
          the full manuscript, pick the package that fits your goals.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:mt-12 md:grid-cols-3 md:gap-4 lg:gap-5">
        {FULL_BOOK_PACKAGES.map((pkg) => (
          <FullBookPackageCard
            key={pkg.tier}
            pkg={pkg}
            ctaLabel="Start in chat"
            ctaHref="/chat?new=1"
            highlighted={pkg.tier === HIGHLIGHTED_TIER}
            badge={pkg.tier === HIGHLIGHTED_TIER ? "Most popular" : undefined}
          />
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground sm:mt-8">
        {FULL_BOOK_COVER_ADDON_LABEL}
      </p>

      <div className="mt-8 flex justify-center sm:mt-10">
        <Link
          href="/chat?new=1"
          className={cn(
            "group inline-flex items-center gap-2 text-sm font-semibold text-walker-navy transition hover:text-walker-teal",
            "dark:text-walker-mist dark:hover:text-walker-teal",
          )}
        >
          Not sure yet? Try chat first — no card required
          <ChevronRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </>
  );
}
