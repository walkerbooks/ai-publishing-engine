export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  role: string;
  book?: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "maya",
    quote:
      "I had notes everywhere and no clear path. The chat pulled out a title, audience, and chapter plan in one sitting. I finally felt like I was writing a real book, not just dreaming about one.",
    name: "Maya R.",
    role: "Memoir author",
    book: "Letters I Never Sent",
  },
  {
    id: "james",
    quote:
      "The preview chapter sold me. Hearing my idea in a consistent voice before I paid for the full manuscript took away the biggest fear: 'What if it doesn't sound like me?'",
    name: "James T.",
    role: "Business coach",
    book: "Lead Without Burning Out",
  },
  {
    id: "elena",
    quote:
      "Outline first, then preview, then the full book. Each step had a clear yes/no moment. I never felt pushed, and I could revise without starting over.",
    name: "Elena V.",
    role: "First-time novelist",
    book: "The Lighthouse Keeper's Daughter",
  },
  {
    id: "david",
    quote:
      "I'm not technical at all. WalkerBook felt like talking to a patient editor who remembers everything. Picking up where I left off after a busy week was seamless.",
    name: "David K.",
    role: "Parenting blogger",
    book: "Raising Curious Minds",
  },
  {
    id: "priya",
    quote:
      "From rough idea to a PDF I could share with beta readers, the whole flow lived in one place. The cover step and full manuscript felt like natural next steps, not surprises.",
    name: "Priya S.",
    role: "Wellness writer",
    book: "Small Rituals, Big Calm",
  },
];
