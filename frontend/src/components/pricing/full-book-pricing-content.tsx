import { FullBookPackageCard } from "@/components/paypal/full-book-package-card";
import { FULL_BOOK_PACKAGES } from "@/lib/paypal/full-book-packages";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FullBookPackageCard } from "@/components/paypal/full-book-package-card";
import { FULL_BOOK_PACKAGES } from "@/lib/paypal/full-book-packages";

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
      </div>

      <div className="mt-10 grid grid-cols-1 items-start gap-5 sm:mt-12 md:grid-cols-3 md:gap-4 lg:gap-5">
        {FULL_BOOK_PACKAGES.map((pkg) => (
          <FullBookPackageCard
            key={pkg.tier}
            pkg={pkg}
            ctaHref="/chat?new=1"
            highlighted={pkg.tier === HIGHLIGHTED_TIER}
            badge={pkg.tier === HIGHLIGHTED_TIER ? "Most popular" : undefined}
          />
        ))}
      </div>
    </>
  );
}
