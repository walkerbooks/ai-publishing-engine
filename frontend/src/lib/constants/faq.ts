export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "what-is-walkerbook",
    question: "What is WalkerBook?",
    answer:
      "WalkerBook helps you turn the book in your head into something readers can hold. Chat through your idea, shape a chapter outline, preview a sample chapter in your voice, then grow it into a full manuscript. You stay in control at every step.",
  },
  {
    id: "how-long",
    question: "How long does it take to create a book?",
    answer:
      "You can start in chat and lock your outline in a single session, often under 30 minutes. The free preview chapter usually takes a few more minutes. After checkout, your full manuscript is generated automatically in the background. You'll receive an email when it's ready to download.",
  },
  {
    id: "how-it-works",
    question: "How does the writing process work?",
    answer:
      "You begin with a short chat so we understand your genre, audience, tone, and goals. WalkerBook turns that into a structured outline you can refine, then writes a preview chapter so you can hear the voice before you commit. Once you're happy, checkout unlocks full manuscript generation and export.",
  },
  {
    id: "revise-outline",
    question: "Can I revise the outline before paying?",
    answer:
      "Yes. The outline is yours to shape before any payment. Adjust chapters, word targets, and structure until it feels right. You only move forward when you're ready for the preview and full manuscript.",
  },
  {
    id: "ownership",
    question: "Do I own my book?",
    answer:
      "Yes. You keep ownership of what you create. WalkerBook is the workshop; you're the author. Use your manuscript however you like, including self-publishing on Amazon, sharing with beta readers, or pitching to traditional publishers.",
  },
  {
    id: "formats",
    question: "What formats will I receive?",
    answer:
      "Your completed manuscript is delivered as a digital download you can open, edit, and share. Cover concepts and print-ready formatting are part of the publishing path we're building. You'll see each step clearly as you move through the workflow.",
  },
  {
    id: "genres",
    question: "What genres does WalkerBook support?",
    answer:
      "Fiction and nonfiction: memoir, business, self-help, romance, thriller, fantasy, and more. During chat we capture your genre, audience, and tone so the outline and preview match the kind of book you want to write.",
  },
];
