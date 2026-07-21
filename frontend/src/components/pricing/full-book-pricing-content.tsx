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
        <Heading
          id={headingId}
          className="text-balance text-2xl font-semibold tracking-tight text-walker-charcoal dark:text-walker-mist sm:text-3xl lg:text-[2rem] lg:leading-snug"
        >
          Clear WalkerBook packages for every stage of your author journey.
        </Heading>
        <p className="mt-3 text-pretty text-sm text-muted-foreground sm:text-base">
          Choose the level of writing support you need now. Upgrade when you&apos;re ready to
          publish more.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 items-stretch gap-5 sm:mt-14 md:grid-cols-3 md:items-start md:gap-4 lg:gap-5">
        {FULL_BOOK_PACKAGES.map((pkg) => (
          <FullBookPackageCard
            key={pkg.tier}
            pkg={pkg}
            ctaHref="/chat?new=1"
            highlighted={pkg.tier === HIGHLIGHTED_TIER}
            badge={pkg.tier === HIGHLIGHTED_TIER ? "Most chosen" : undefined}
          />
        ))}
      </div>
    </>
  );
}
