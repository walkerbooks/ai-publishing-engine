import type {
  AppendConversationMessageBody,
  ConversationMessageDto,
} from "@/lib/api/conversation-client";
import { decodeApiBlob, utf8ToBase64 } from "@/lib/chat/conversation-blob-codec";
import type { ChatBlockKind, ChatMessage, VideoMeta } from "@/lib/types/chat";
import {
  createInitialPublishingState,
  type PublishingState,
} from "@/stores/publishing-types";

function parseJson<T>(raw: string | null | undefined): T | undefined {
  if (raw == null || raw === "") return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** When only the outline was persisted (older chats), synthesize a minimal BSO so preview can run. */
export function minimalBookSpecFromOutline(
  outline: Record<string, unknown>,
): Record<string, unknown> {
  const title =
    typeof outline.book_title === "string" ? outline.book_title : undefined;
  let pages = 150;
  if (typeof outline.estimated_pages === "number" && Number.isFinite(outline.estimated_pages)) {
    pages = Math.min(300, Math.max(50, Math.round(outline.estimated_pages)));
  }
  return {
    genre: "General nonfiction",
    audience: "General readers",
    tone: "Engaging and reader-friendly",
    target_length_pages: pages,
    format_type: "all",
    page_size: "6x9",
    language: "English",
    title: title ?? undefined,
    custom_instructions:
      "Requirements are primarily in the saved outline; match genre, tone, and chapter structure from the outline.",
  };
}

export function apiMessageToChatMessage(m: ConversationMessageDto): ChatMessage {
  const kind = (m.kind as ChatBlockKind | undefined) || undefined;
  const outlineRaw = decodeApiBlob(m.outline_json ?? undefined);
  const videosRaw = decodeApiBlob(m.videos_json ?? undefined);
  const outline = parseJson<ChatMessage["outline"]>(outlineRaw ?? undefined);
  const videos = parseJson<VideoMeta[]>(videosRaw ?? undefined);
  const previewRaw = decodeApiBlob(m.preview_markdown ?? undefined);
  return {
    id: m.client_message_id || m.id,
    role: m.role,
    content: m.content,
    kind,
    outline,
    videos: videos?.length ? videos : undefined,
    previewMarkdown: previewRaw ?? undefined,
  };
}

/** Must match Go `validate:"omitempty,oneof=..."` on append message. */
const APPEND_MESSAGE_KINDS = new Set<ChatBlockKind>([
  "intake",
  "outline",
  "preview",
  "gate",
]);

export function chatMessageToAppendBody(msg: ChatMessage): AppendConversationMessageBody {
  if (msg.role === "user") {
    return {
      role: "user",
      content: msg.content,
      client_message_id: msg.id,
    };
  }

  const body: AppendConversationMessageBody = {
    role: "assistant",
    content: msg.content,
    client_message_id: msg.id,
  };
  if (msg.kind && APPEND_MESSAGE_KINDS.has(msg.kind)) {
    body.kind = msg.kind;
  }
  if (msg.outline != null) {
    body.outline_json = utf8ToBase64(JSON.stringify(msg.outline));
  }
  if (msg.videos?.length) {
    body.videos_json = utf8ToBase64(JSON.stringify(msg.videos));
  }
  if (msg.previewMarkdown) {
    body.preview_markdown = msg.previewMarkdown;
  }
  return body;
}

/** Rebuild publishing state from persisted messages; book_spec_json on outline rows restores BSO. */
export function restorePublishingFromApiMessages(
  conversationPublicId: string,
  apiMessages: ConversationMessageDto[],
): PublishingState {
  const chatMessages = apiMessages.map(apiMessageToChatMessage);

  let bookOutline: Record<string, unknown> | null = null;
  for (let i = apiMessages.length - 1; i >= 0; i--) {
    const m = apiMessages[i];
    if (m.role === "assistant" && m.outline_json) {
      const decoded = decodeApiBlob(m.outline_json);
      const o = parseJson<Record<string, unknown>>(decoded ?? undefined);
      if (o) {
        bookOutline = o;
        break;
      }
    }
  }

  let bookSpec: Record<string, unknown> | null = null;
  for (let i = apiMessages.length - 1; i >= 0; i--) {
    const m = apiMessages[i];
    if (m.role !== "assistant" || m.book_spec_json == null) continue;
    const decoded = decodeApiBlob(m.book_spec_json);
    const s = parseJson<Record<string, unknown>>(decoded ?? undefined);
    if (s && Object.keys(s).length > 0) {
      bookSpec = s;
      break;
    }
  }
  if (!bookSpec && bookOutline) {
    bookSpec = minimalBookSpecFromOutline(bookOutline);
  }

  let composerStep: PublishingState["composerStep"] = "intake";
  const lastAsst = [...chatMessages].reverse().find((m) => m.role === "assistant");
  if (lastAsst?.kind === "preview") composerStep = "preview";
  else if (lastAsst?.kind === "outline" || bookOutline) composerStep = "outline";

  let awaitingGate: PublishingState["awaitingGate"] = null;
  if (lastAsst?.kind === "gate") {
    const c = (lastAsst.content || "").toLowerCase();
    if (c.includes("preview")) awaitingGate = "preview";
    else if (c.includes("full") || c.includes("payment") || c.includes("access"))
      awaitingGate = "full";
    else awaitingGate = "outline";
  }

  return {
    ...createInitialPublishingState(),
    sessionId: conversationPublicId,
    chatMessages,
    bookOutline,
    intakeComplete: Boolean(bookOutline),
    bookSpec,
    composerStep,
    composerAction: "proceed",
    awaitingGate,
    activeBookId: null,
  };
}
