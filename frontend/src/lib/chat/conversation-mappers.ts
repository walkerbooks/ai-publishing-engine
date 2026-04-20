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

/** Strip `data:*;base64,` for JSON fields the Go API decodes as []byte. */
export function dataUrlToRawBase64(dataUrl: string): string {
  const t = dataUrl.trim();
  const m = /^data:[^;]+;base64,(.+)$/i.exec(t);
  if (m?.[1]) return m[1].replace(/\s/g, "");
  return t.replace(/\s/g, "");
}

/** When only the outline was persisted (older chats), synthesize a minimal BSO so preview can run. */
export function minimalBookSpecFromOutline(
  outline: Record<string, unknown>,
): Record<string, unknown> {
  const title =
    typeof outline.book_title === "string" ? outline.book_title : undefined;
  let pages = 24;
  if (typeof outline.estimated_pages === "number" && Number.isFinite(outline.estimated_pages)) {
    pages = Math.min(200, Math.max(1, Math.round(outline.estimated_pages)));
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
  const specRaw = decodeApiBlob(m.book_spec_json ?? undefined);
  const bookSpec = parseJson<Record<string, unknown>>(specRaw ?? undefined);
  let coverImageDataUrl: string | null | undefined;
  if (kind === "cover" && typeof m.cover_image_png === "string" && m.cover_image_png.trim()) {
    const mime =
      typeof m.cover_image_mime === "string" && m.cover_image_mime.trim()
        ? m.cover_image_mime.trim()
        : "image/png";
    coverImageDataUrl = `data:${mime};base64,${m.cover_image_png.trim()}`;
  }
  return {
    id: m.client_message_id || m.id,
    role: m.role,
    content: m.content,
    kind,
    outline,
    videos: videos?.length ? videos : undefined,
    bookSpec: bookSpec && Object.keys(bookSpec).length > 0 ? bookSpec : undefined,
    previewMarkdown: previewRaw ?? undefined,
    coverImageDataUrl,
    coverVariantIndex:
      typeof m.cover_variant_index === "number" && Number.isFinite(m.cover_variant_index)
        ? m.cover_variant_index
        : undefined,
  };
}

/** Must match Go `validate:"omitempty,oneof=..."` on append message. */
const APPEND_MESSAGE_KINDS = new Set<ChatBlockKind>([
  "intake",
  "outline",
  "preview",
  "gate",
  "cover",
]);

export function chatMessageToAppendBody(
  msg: ChatMessage,
  linkBookPublicId?: string | null,
): AppendConversationMessageBody {
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
  if (msg.bookSpec != null && Object.keys(msg.bookSpec).length > 0) {
    body.book_spec_json = utf8ToBase64(JSON.stringify(msg.bookSpec));
  }
  if (msg.kind === "cover" && msg.coverImageDataUrl?.trim()) {
    body.cover_image_png = dataUrlToRawBase64(msg.coverImageDataUrl);
    body.cover_image_mime = "image/png";
    if (
      typeof msg.coverVariantIndex === "number" &&
      Number.isFinite(msg.coverVariantIndex) &&
      msg.coverVariantIndex >= 1 &&
      msg.coverVariantIndex <= 3
    ) {
      body.cover_variant_index = Math.round(msg.coverVariantIndex);
    }
    const bid = linkBookPublicId?.trim();
    if (bid) body.link_book_public_id = bid;
  }
  return body;
}

/**
 * Classify gate copy — order matters (post-preview mentions pay + cover + full book + preview).
 */
function gateStageFromGateContent(
  content: string,
): "outline" | "preview" | "post_preview" | "full" {
  const c = content.toLowerCase();
  if (c.includes("pay") && (c.includes("cover") || c.includes("$1"))) {
    return "post_preview";
  }
  if (
    c.includes("unlock the full") ||
    c.includes("full book") ||
    c.includes("payment") ||
    c.includes("paypal") ||
    (c.includes("unlock") && c.includes("full"))
  ) {
    return "full";
  }
  if (c.includes("preview")) return "preview";
  return "outline";
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

  const hasPreviewMessage = chatMessages.some(
    (m) => m.role === "assistant" && m.kind === "preview",
  );

  let previewContent = "";
  for (let i = chatMessages.length - 1; i >= 0; i--) {
    const m = chatMessages[i];
    if (m.role === "assistant" && m.kind === "preview" && m.previewMarkdown?.trim()) {
      previewContent = m.previewMarkdown.trim();
      break;
    }
  }

  let composerStep: PublishingState["composerStep"] = "intake";
  if (hasPreviewMessage) {
    composerStep = "preview";
  } else if (bookOutline) {
    composerStep = "outline";
  }

  /** Newest gate bubble (not necessarily the newest assistant — preview may sort after gate if inserts raced). */
  const lastGate = [...chatMessages].reverse().find(
    (m) => m.role === "assistant" && m.kind === "gate",
  );

  let awaitingGate: PublishingState["awaitingGate"] = null;
  if (lastGate) {
    const stage = gateStageFromGateContent(lastGate.content || "");
    if (stage === "post_preview" && hasPreviewMessage) {
      awaitingGate = "post_preview";
    } else if (stage === "preview" && hasPreviewMessage) {
      awaitingGate = null;
    } else if (stage === "full") {
      awaitingGate = "full";
    } else if (stage === "preview") {
      awaitingGate = "preview";
    } else {
      awaitingGate = "outline";
    }
  }

  return {
    ...createInitialPublishingState(),
    sessionId: conversationPublicId,
    chatMessages,
    bookOutline,
    intakeComplete: Boolean(bookOutline || bookSpec),
    bookSpec,
    previewContent,
    composerStep,
    composerAction: "proceed",
    awaitingGate,
    activeBookId: null,
  };
}
