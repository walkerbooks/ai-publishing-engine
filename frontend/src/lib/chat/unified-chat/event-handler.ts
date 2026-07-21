import type { ChatBlockKind } from "@/lib/types/chat";
import { syncBookToServerAfterPreview } from "@/lib/api/sync-server-book";
import { userErrorMessage } from "@/lib/errors/user-error-message";
import { newId } from "@/lib/utils/id";

type Handlers = {
  pushAssistantMessage: (msg: any) => void;
  appendAssistantDelta: (messageId: string, delta: string) => void;
  patchChatMessage: (messageId: string, patch: Record<string, unknown>) => void;
  setIntakeResult: (
    complete: boolean,
    spec: Record<string, unknown> | null,
    bookId: string | null,
  ) => void;
  setAwaitingGate: (g: null | "outline" | "preview" | "post_preview" | "full") => void;
  setAssistantOutline: (messageId: string, outline: any) => void;
  setBookOutline: (outline: Record<string, unknown> | null) => void;
  setAssistantPreview: (
    messageId: string,
    previewMarkdown: string,
  ) => void;
  setPreviewContent: (markdown: string) => void;
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
        (data.gateStage as
          | "outline"
          | "preview"
          | "post_preview"
          | "full"
          | undefined) ?? null,
      );
    }
    return;
  }

  if (event === "message_delta") {
    handlers.appendAssistantDelta(data.messageId as string, data.delta);
    return;
  }

  if (event === "book_spec_ready") {
    const mid = data.messageId as string | undefined;
    const spec = (data.bookSpec ?? null) as Record<string, unknown> | null;
    if (mid) {
      const patch: Record<string, unknown> = {};
      if (
        spec &&
        typeof spec === "object" &&
        Object.keys(spec).length > 0
      ) {
        patch.bookSpec = spec;
      }
      if (typeof data.offerCollaborativeFeedback === "boolean") {
        patch.offerCollaborativeFeedback = data.offerCollaborativeFeedback;
      }
      if (Object.keys(patch).length > 0) {
        handlers.patchChatMessage(mid, patch);
      }
    }
    const bookId = newId();
    handlers.setIntakeResult(
      Boolean(data.intakeComplete),
      spec,
      bookId,
    );
    return;
  }

  if (event === "outline_ready") {
    const outline = data.outline as Record<string, unknown> | undefined;
    handlers.setAssistantOutline(data.messageId as string, outline);
    if (outline) handlers.setBookOutline(outline);
    const spec = data.bookSpec as Record<string, unknown> | undefined;
    if (spec && typeof spec === "object" && Object.keys(spec).length > 0) {
      handlers.setIntakeResult(true, spec, null);
      handlers.patchChatMessage(data.messageId as string, { bookSpec: spec });
    }
    return;
  }

  if (event === "preview_ready") {
    const md = String(data.previewMarkdown ?? "");
    handlers.setAssistantPreview(data.messageId as string, md);
    handlers.setPreviewContent(md);
    const spec = data.bookSpec as Record<string, unknown> | undefined;
    if (spec && typeof spec === "object" && Object.keys(spec).length > 0) {
      handlers.setIntakeResult(true, spec, null);
      handlers.patchChatMessage(data.messageId as string, { bookSpec: spec });
    }
    void syncBookToServerAfterPreview(md);
    return;
  }

  if (event === "error") {
    handlers.setErr(userErrorMessage(data.message ?? "Unified chat failed", "chat"));
    return;
  }
}

