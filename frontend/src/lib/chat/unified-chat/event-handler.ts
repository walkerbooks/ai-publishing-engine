import type { ChatBlockKind } from "@/lib/types/chat";

type Handlers = {
  pushAssistantMessage: (msg: any) => void;
  appendAssistantDelta: (messageId: string, delta: string) => void;
  setIntakeResult: (
    complete: boolean,
    spec: Record<string, unknown> | null,
    bookId: string | null,
  ) => void;
  setAwaitingGate: (g: null | "outline" | "preview" | "full") => void;
  setAssistantOutline: (messageId: string, outline: any) => void;
  setBookOutline: (outline: Record<string, unknown> | null) => void;
  setAssistantPreview: (
    messageId: string,
    previewMarkdown: string,
  ) => void;
  setErr: (msg: string) => void;
};

export function handleUnifiedChatSseEvent(
  event: string,
  data: any,
  handlers: Handlers,
  getPlaceholder: (kind: ChatBlockKind, content?: unknown) => string,
) {
  if (event === "message_start") {
    const kind = data.kind as ChatBlockKind;
    const messageId = data.messageId as string;
    handlers.pushAssistantMessage({
      id: messageId,
      role: "assistant",
      kind,
      content: getPlaceholder(kind, data.content),
    });
    if (kind === "gate") {
      handlers.setAwaitingGate(
        (data.gateStage as "outline" | "preview" | "full" | undefined) ?? null,
      );
    }
    return;
  }

  if (event === "message_delta") {
    handlers.appendAssistantDelta(data.messageId as string, data.delta);
    return;
  }

  if (event === "book_spec_ready") {
    handlers.setIntakeResult(
      Boolean(data.intakeComplete),
      (data.bookSpec ?? null) as Record<string, unknown> | null,
      null,
    );
    return;
  }

  if (event === "outline_ready") {
    const outline = data.outline as Record<string, unknown> | undefined;
    handlers.setAssistantOutline(data.messageId as string, outline);
    if (outline) handlers.setBookOutline(outline);
    return;
  }

  if (event === "preview_ready") {
    handlers.setAssistantPreview(
      data.messageId as string,
      data.previewMarkdown,
    );
    return;
  }

  if (event === "error") {
    handlers.setErr(String(data.message ?? "Unified chat failed"));
    return;
  }
}

