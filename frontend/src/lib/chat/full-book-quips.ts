/** Rotating lines while the manuscript is being written (shown in the assistant bubble). */
export const FULL_BOOK_QUIPS = [
  "Adding a little spice…",
  "Grabbing the pen…",
  "Brainstorming the next beat…",
  "Sharpening the chapter hooks…",
  "Letting the characters breathe…",
  "Polishing a paragraph…",
  "Chasing the perfect closing line…",
  "Steeping ideas like tea…",
  "Lining up the next scene…",
  "Checking the story compass…",
] as const;

export function randomFullBookQuip(): string {
  const i = Math.floor(Math.random() * FULL_BOOK_QUIPS.length);
  return FULL_BOOK_QUIPS[i] ?? FULL_BOOK_QUIPS[0];
}
