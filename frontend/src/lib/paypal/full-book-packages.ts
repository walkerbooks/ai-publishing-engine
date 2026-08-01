export type FullBookPackageTier = "single" | "daily_club" | "triple";

export type FullBookPackageBonusLink = {
  prefix: string;
  label: string;
  href: string;
};

export type FullBookPackageBonusSection = {
  title: string;
  items: string[];
  link?: FullBookPackageBonusLink;
};

export type FullBookPackage = {
  tier: FullBookPackageTier;
  eyebrow: string;
  name: string;
  description: string;
  priceLabel: string;
  frequencyLabel: string;
  features: string[];
  bonusSections?: FullBookPackageBonusSection[];
  ctaLabel: string;
};

/**
 * Checkbox copy on the package dialog. The +$1 is applied in PayPal when Go honors
 * `include_cover` on checkout.
 */
export const FULL_BOOK_COVER_ADDON_LABEL =
  "Add AI cover art, three layout options after checkout ($1 add-on, one generation). You will choose one for your book and PDF.";

/** Display copy; amounts are marketing labels — Go must map tier → PayPal amount / plan. */
export const FULL_BOOK_PACKAGES: FullBookPackage[] = [
  {
    tier: "single",
    eyebrow: "Fast start",
    name: "Single Book",
    description:
      "One fully personalized manuscript when you want a focused first book without a subscription.",
    priceLabel: "$19",
    frequencyLabel: "one-time",
    ctaLabel: "Buy Now",
    features: [
      "1 fully personalized book",
      "100+ professionally written pages",
      "Delivered in under 1 hour",
      "You define the topic, tone, and style",
      "Ready to publish, sell, or share (Amazon, Google Play, Apple Books)",
      "Full ownership, 100% yours",
      "Includes .DOC (editable) and .PDF (ready-to-read)",
    ],
  },
  {
    tier: "triple",
    eyebrow: "Best value",
    name: "Triple Pack",
    description:
      "Three personalized books each month with member access, so you can keep publishing on a steady rhythm.",
    priceLabel: "$19",
    frequencyLabel: "per month",
    ctaLabel: "Subscribe",
    features: [
      "3 fully personalized books",
      "100+ pages per book",
      "Delivered in under 1 hour",
      "You define the topic, tone, and style",
      "Ready to publish, sell, or share (Amazon, Google Play, Apple Books)",
      "Full ownership, 100% yours",
      "Includes .DOC (editable) and .PDF (ready-to-read)",
    ],
    bonusSections: [
      {
        title: "Bonus",
        items: [
          "Access to your private member area: Triple Club Access",
          "Welcome Guide: Triple Pack Welcome PDF",
        ],
      },
    ],
  },
  {
    tier: "daily_club",
    eyebrow: "Ongoing",
    name: "Daily Club",
    description:
      "For authors shipping books every day, with daily covers and private club access built in.",
    priceLabel: "$49",
    frequencyLabel: "per month",
    ctaLabel: "Join Now",
    features: [
      "Up to 31 fully personalized books (1 per day)",
      "Up to 186 book covers (6 per day)",
      "100+ pages per book",
      "Delivered in under 1 hour",
      "You define the topic, tone, and style",
      "Ready to publish, sell, or share (Amazon, Google Play, Apple Books)",
      "Full ownership, 100% yours",
      "Includes .DOC (editable) and .PDF (ready-to-read)",
    ],
    bonusSections: [
      {
        title: "Covers Bonus",
        items: [
          "6 professional cover designs per day, up to 186 per month!",
          "Save time and money with ready-to-use, high-impact visuals for every book.",
        ],
        link: {
          prefix: "See examples: ",
          label: "Cover Pack Presentation",
          href: "#cover-pack-presentation",
        },
      },
      {
        title: "Bonus",
        items: [
          "Access to your private member area: Daily Club Access",
          "Welcome Guide: Daily Club Welcome PDF",
        ],
      },
    ],
  },
];
