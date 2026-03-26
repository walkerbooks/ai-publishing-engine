import type { BookOutlineLite, ChatMessage } from "@/lib/types/chat";

export type PublishingState = {
  sessionId: string;
  activeBookId: string | null;
  chatMessages: ChatMessage[];
  intakeComplete: boolean;
  awaitingGate: null | "outline" | "preview" | "full";
  composerStep: "intake" | "outline" | "preview";
  composerAction: "proceed" | "revise";
  bookSpec: Record<string, unknown> | null;
  bookOutline: Record<string, unknown> | null;
  previewContent: string;
  streamedPreviewContent: string;
  fullBookContent: string;
  mockPaymentConfirmed: boolean;
  pendingPrompt: string | null;
  userName: string | null;
};

export type PublishingActions = {
  pushUserMessage: (content: string) => void;
  pushAssistantMessage: (msg: ChatMessage) => void;
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
  setAwaitingGate: (g: null | "outline" | "preview" | "full") => void;
  setComposerStep: (s: "intake" | "outline" | "preview") => void;
  setComposerAction: (a: "proceed" | "revise") => void;
  resetFlow: () => void;
  setIntakeResult: (
    complete: boolean,
    spec: Record<string, unknown> | null,
    bookId: string | null,
  ) => void;
  setBookOutline: (o: Record<string, unknown> | null) => void;
  setPreviewContent: (s: string) => void;
  appendStreamPreview: (chunk: string) => void;
  clearStreamPreview: () => void;
  setFullBookContent: (s: string) => void;
  setMockPayment: (v: boolean) => void;
  setUserName: (n: string | null) => void;
};

export function createInitialPublishingState(): PublishingState {
  return {
    sessionId: crypto.randomUUID(),
    activeBookId: null,
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
    pendingPrompt: null,
    userName: null,
  };
}
