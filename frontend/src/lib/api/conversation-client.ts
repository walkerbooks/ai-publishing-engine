import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { readGoErrorMessage, throwIfGoResponseFailed } from "@/lib/api/go-response";
import { getLogger } from "@/lib/log";

const log = getLogger("conversation-client");

export type ConversationDto = {
  public_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ConversationMessageDto = {
  id: string;
  sequence: number;
  role: "user" | "assistant";
  content: string;
  kind?: string | null;
  /** String (JSON / base64), or JSON object/array if the server embeds structured data. */
  outline_json?: unknown;
  /** Not accepted on append by current Go API; optional on GET if the server ever adds it. */
  book_spec_json?: unknown;
  videos_json?: unknown;
  preview_markdown?: unknown;
  client_message_id?: string | null;
  /** Base64 PNG from Go `[]byte` JSON. */
  cover_image_png?: string | null;
  cover_image_mime?: string | null;
  cover_variant_index?: number | null;
  created_at: string;
};

function authHeaders(token: string): HeadersInit {
  return goAuthHeaders(token);
}

/** Best-effort: never throws — sidebar can load without server conversation support. */
export async function listConversations(accessToken: string): Promise<ConversationDto[]> {
  const init: RequestInit = {
    headers: authHeaders(accessToken),
    credentials: "include",
    cache: "no-store",
  };
  let res = await fetch(`${GO_API_PREFIX}/v1/conversations`, init);
  if (res.status === 404 || res.status === 500) {
    const alt = await fetch(`${GO_API_PREFIX}/v1/conversation/list`, init);
    if (alt.ok) res = alt;
  }
  if (res.ok) {
    const data = (await res.json()) as { conversations?: ConversationDto[] };
    return data.conversations ?? [];
  }
  const msg = await readGoErrorMessage(res);
  log.warning(`listConversations: HTTP ${res.status}`, msg);
  if (res.status === 401) {
    const { invalidateGoSession } = await import("@/lib/auth/invalidate-go-session");
    invalidateGoSession(msg);
  }
  return [];
}

export async function createConversation(
  accessToken: string,
  title: string,
): Promise<ConversationDto> {
  const res = await fetch(`${GO_API_PREFIX}/v1/conversation`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    log.warning(`createConversation: HTTP ${res.status}`);
    await throwIfGoResponseFailed(res);
  }
  const data = (await res.json()) as { conversation?: ConversationDto };
  if (!data.conversation) throw new Error("Invalid create conversation response");
  return data.conversation;
}

export async function getConversationMessages(
  accessToken: string,
  conversationPublicId: string,
): Promise<ConversationMessageDto[]> {
  const res = await fetch(
    `${GO_API_PREFIX}/v1/conversation/${encodeURIComponent(conversationPublicId)}`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
      cache: "no-store",
    },
  );
  if (!res.ok) {
    log.warning(`getConversationMessages: HTTP ${res.status}`);
    await throwIfGoResponseFailed(res);
  }
  const data = (await res.json()) as { messages?: ConversationMessageDto[] };
  return data.messages ?? [];
}

/** DELETE /v1/conversation/{id} — 204; 404 treated as success (already gone). */
export async function deleteConversation(
  accessToken: string,
  conversationPublicId: string,
): Promise<void> {
  const res = await fetch(
    `${GO_API_PREFIX}/v1/conversation/${encodeURIComponent(conversationPublicId)}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
      credentials: "include",
    },
  );
  if (res.ok || res.status === 404) return;
  log.warning(`deleteConversation: HTTP ${res.status}`);
  await throwIfGoResponseFailed(res);
}

export async function patchConversationTitle(
  accessToken: string,
  conversationPublicId: string,
  title: string,
): Promise<ConversationDto> {
  const res = await fetch(
    `${GO_API_PREFIX}/v1/conversation/${encodeURIComponent(conversationPublicId)}`,
    {
      method: "PATCH",
      headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title }),
    },
  );
  if (!res.ok) {
    log.warning(`patchConversationTitle: HTTP ${res.status}`);
    await throwIfGoResponseFailed(res);
  }
  const data = (await res.json()) as { conversation?: ConversationDto };
  if (!data.conversation) throw new Error("Invalid patch conversation response");
  return data.conversation;
}

/** Fields must match Go `AppendConversationMessageRequest` (DisallowUnknownFields). */
export type AppendConversationMessageBody = {
  role: "user" | "assistant";
  content: string;
  kind?: string | null;
  /** Base64-encoded UTF-8 JSON (Go []byte in JSON). */
  outline_json?: string | null;
  videos_json?: string | null;
  /** Plain markdown string (Go *string). */
  preview_markdown?: string | null;
  /** Base64 UTF-8 JSON of BSO (Go []byte in JSON). */
  book_spec_json?: string | null;
  client_message_id?: string | null;
  /** Raw PNG base64 (Go []byte in JSON), not a data URL prefix. */
  cover_image_png?: string | null;
  cover_image_mime?: string | null;
  cover_variant_index?: number | null;
  link_book_public_id?: string | null;
};

/** Best-effort persistence: does not throw on HTTP errors (avoids noisy dev stacks); still invalidates session on 401. */
export async function appendConversationMessage(
  accessToken: string,
  conversationPublicId: string,
  body: AppendConversationMessageBody,
): Promise<ConversationMessageDto | null> {
  const res = await fetch(
    `${GO_API_PREFIX}/v1/conversation/${encodeURIComponent(conversationPublicId)}/messages`,
    {
      method: "POST",
      headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const msg = await readGoErrorMessage(res);
    log.warning(`appendConversationMessage: HTTP ${res.status}`, msg);
    if (res.status === 401) {
      const { invalidateGoSession } = await import("@/lib/auth/invalidate-go-session");
      invalidateGoSession(msg);
    }
    return null;
  }
  const data = (await res.json()) as { message?: ConversationMessageDto };
  if (!data.message) {
    log.warning("appendConversationMessage: invalid response shape");
    return null;
  }
  return data.message;
}
