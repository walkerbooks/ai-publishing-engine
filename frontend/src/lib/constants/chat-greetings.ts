/**
 * Initial ChatHero `<h1>` must match server HTML and the client’s first paint.
 * Random greetings run only in `useEffect` after hydration.
 */
export const CHAT_HERO_HYDRATION_SAFE_HEADLINE = "What's on your mind today?" as const;

/** Random hero greetings when the visitor is not logged in (or has no display label). */
export const GENERIC_CHAT_GREETINGS = [
  CHAT_HERO_HYDRATION_SAFE_HEADLINE,
  "Ready to bring your book to life?",
  "What story are we telling today?",
  "Let's shape your next book—where do you want to start?",
  "Good to see you. What would you like to create?",
  "Tell us about the book you're imagining.",
  "What's the book you've been wanting to write?",
  "Jump in—what's your book idea?",
  "Welcome. What are we building today?",
  "Every great book starts with an idea. What's yours?",
] as const;

/** Use `{name}`; filled from profile when the user is logged in. */
export const PERSONALIZED_CHAT_GREETINGS = [
  "What's on your mind today, {name}?",
  "Hi {name}, ready to create something readers will love?",
  "Good to see you, {name}. What book is calling you today?",
  "{name}, let's talk about the story you want to tell.",
  "Welcome back, {name}. What are we working on?",
  "Hi {name}—what kind of book is on your mind?",
  "{name}, tell us about the book you're dreaming up.",
  "Great to have you here, {name}. Where should we begin?",
  "{name}, ready to turn your idea into a real book?",
  "Hey {name}, what's the book you want to share with the world?",
] as const;
