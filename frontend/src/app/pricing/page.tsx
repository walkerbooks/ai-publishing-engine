import { FullBookPricingContent } from "@/components/pricing/full-book-pricing-content";

export default function PricingPage() {
  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-background px-4 py-12 sm:min-h-[calc(100dvh-5rem)] sm:py-16">
      <div className="mx-auto max-w-6xl">
        <FullBookPricingContent headingLevel="h1" headingId="pricing-page-heading" />
      </div>
    </main>
  );
}
