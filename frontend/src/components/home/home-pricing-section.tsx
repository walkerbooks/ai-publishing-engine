import { FullBookPricingContent } from "@/components/pricing/full-book-pricing-content";

export function HomePricingSection() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="scroll-mt-[calc(3.5rem+0.125rem)] border-t border-border bg-background px-4 py-16 sm:scroll-mt-[calc(5rem+0.125rem)] sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <FullBookPricingContent headingLevel="h2" headingId="pricing-heading" />
      </div>
    </section>
  );
}
