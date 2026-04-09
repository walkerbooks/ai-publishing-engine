export type FullBookPackageTier = "single" | "double" | "triple";

export type FullBookPackage = {
  tier: FullBookPackageTier;
  name: string;
  priceLabel: string;
  frequencyLabel: string;
  features: string[];
};

/** Display copy; amounts are marketing labels — Go must map tier → PayPal amount / plan. */
export const FULL_BOOK_PACKAGES: FullBookPackage[] = [
  {
    tier: "single",
    name: "Single Book",
    priceLabel: "$19.98",
    frequencyLabel: "One Time",
    features: [
      "1 fully personalized book",
      "100+ pages per book",
      "Delivered in under 1 hour",
      "You define the topic, tone, and style",
      "Ready to publish, sell, or share (Amazon, Google Play, Apple Books)",
      "Full ownership — 100% yours",
      "Includes .DOC (editable) and .PDF (ready-to-read)",
    ],
  },
  {
    tier: "double",
    name: "Double Book",
    priceLabel: "$24.97",
    frequencyLabel: "One Time",
    features: [
      "2 fully personalized books",
      "100+ pages per book",
      "Delivered in under 1 hour each",
      "You define topic, tone, and style per book",
      "Ready to publish, sell, or share (Amazon, Google Play, Apple Books)",
      "Full ownership — 100% yours",
      "Includes .DOC and .PDF for each title",
    ],
  },
  {
    tier: "triple",
    name: "Triple Pack",
    priceLabel: "$29.99",
    frequencyLabel: "One Time",
    features: [
      "3 fully personalized books",
      "100+ professional written pages",
      "Delivered in under 1 hour each",
      "You define topic, tone, and style per book",
      "Ready to publish, sell, or share (Amazon, Google Play, Apple Books)",
      "Full ownership — 100% yours",
      "Includes .DOC and .PDF for each title",
    ],
  },
];
