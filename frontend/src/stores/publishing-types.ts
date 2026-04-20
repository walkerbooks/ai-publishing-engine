import type { BookOutlineLite, ChatMessage, VideoMeta } from "@/lib/types/chat";

export type PublishingState = {
  sessionId: string;
  activeBookId: string | null;
  /** True after preview payload was successfully POSTed or PATCHed to Go for `activeBookId`. */
  bookPreviewRowSynced: boolean;
  chatMessages: ChatMessage[];
  intakeComplete: boolean;
  awaitingGate: null | "outline" | "preview" | "post_preview" | "full";
  composerStep: "intake" | "outline" | "preview";
  composerAction: "proceed" | "revise";
  bookSpec: Record<string, unknown> | null;
  bookOutline: Record<string, unknown> | null;
  previewContent: string;
  streamedPreviewContent: string;
  fullBookContent: string;
  mockPaymentConfirmed: boolean;
  /**
   * User chose full book via subscription credits (skips PayPal). Drives the same poller path as
   * mock payment while the book is still preview_ready / awaiting_payment.
   */
  subscriptionFullGenUnlocked: boolean;
  pendingPrompt: string | null;
  userName: string | null;
  /** Guest onboarding: collected after name (email for updates). */
  guestEmail: string | null;
  /**
   * User chose "Let's build it together" — AI should infer BSO and lead with proposals.
   * Cleared when intake completes or explicitly reset.
   */
  intakeCollaborative: boolean;
};

export type PublishingActions = {
  pushUserMessage: (content: string) => void;
  pushAssistantMessage: (msg: ChatMessage) => void;
  /** After name reply: append YouTube block + videos onto that assistant message (no extra bubble). */
  attachOnboardingVideosToMessage: (
    messageId: string,
    videos: VideoMeta[],
  ) => void;
  popLastUserMessage: () => void;
  appendAssistantDelta: (messageId: string, delta: string) => void;
  setAssistantOutline: (
    messageId: string,
    outline: BookOutlineLite,
  ) => void;
  setAssistantPreview: (
    messageId: string,
    previewMarkdown: string,
  ) => void;
  setPendingPrompt: (p: string | null) => void;
  setAwaitingGate: (g: null | "outline" | "preview" | "post_preview" | "full") => void;
  setComposerStep: (s: "intake" | "outline" | "preview") => void;
  setComposerAction: (a: "proceed" | "revise") => void;
  resetFlow: () => void;
  setIntakeResult: (
    complete: boolean,
    spec: Record<string, unknown> | null,
    bookId: string | null,
  ) => void;
  /** e.g. deep link after PayPal return: /chat?book=… */
  setActiveBookId: (bookId: string | null) => void;
  setBookOutline: (o: Record<string, unknown> | null) => void;
  setPreviewContent: (s: string) => void;
  appendStreamPreview: (chunk: string) => void;
  clearStreamPreview: () => void;
  setFullBookContent: (s: string) => void;
  setMockPayment: (v: boolean) => void;
  setSubscriptionFullGenUnlocked: (v: boolean) => void;
  setUserName: (n: string | null) => void;
  setGuestEmail: (email: string | null) => void;
  setIntakeCollaborative: (v: boolean) => void;
  patchChatMessage: (
    messageId: string,
    patch: Partial<import("@/lib/types/chat").ChatMessage>,
  ) => void;
};

export function createInitialPublishingState(): PublishingState {
  return {
    sessionId: crypto.randomUUID(),
    activeBookId: null,
    bookPreviewRowSynced: false,
    chatMessages: [],
    intakeComplete: false,
    awaitingGate: null,
    composerStep: "intake",
    composerAction: "proceed",
    bookSpec: null,
    bookOutline: null,
    previewContent: "",
    streamedPreviewContent: "",
    fullBookContent: "",
    mockPaymentConfirmed: false,
    subscriptionFullGenUnlocked: false,
    pendingPrompt: null,
    userName: null,
    guestEmail: null,
    intakeCollaborative: false,
  };
}
