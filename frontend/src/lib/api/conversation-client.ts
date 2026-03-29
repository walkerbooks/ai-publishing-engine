import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
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
  videos_json?: unknown;
  preview_markdown?: unknown;
  client_message_id?: string | null;
  created_at: string;
};

async function readErrorMessage(res: Response): Promise<string> {
  const t = await res.text();
  try {
    const j = JSON.parse(t) as { error?: string };
    if (j.error) return j.error;
  } catch {
    /* */
  }
  return t || `Request failed: ${res.status}`;
}

function authHeaders(token: string): HeadersInit {
  return goAuthHeaders(token);
}

export async function listConversations(accessToken: string): Promise<ConversationDto[]> {
  const res = await fetch(`${GO_API_PREFIX}/v1/conversation/list`, {
    headers: authHeaders(accessToken),
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    log.warning(`listConversations: HTTP ${res.status}`);
    throw new Error(await readErrorMessage(res));
  }
  const data = (await res.json()) as { conversations?: ConversationDto[] };
  return data.conversations ?? [];
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
    throw new Error(await readErrorMessage(res));
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
    throw new Error(await readErrorMessage(res));
  }
  const data = (await res.json()) as { messages?: ConversationMessageDto[] };
  return data.messages ?? [];
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
    throw new Error(await readErrorMessage(res));
  }
  const data = (await res.json()) as { conversation?: ConversationDto };
  if (!data.conversation) throw new Error("Invalid patch conversation response");
  return data.conversation;
}

export type AppendConversationMessageBody = {
  role: "user" | "assistant";
  content: string;
  kind?: string | null;
  outline_json?: string | null;
  videos_json?: string | null;
  preview_markdown?: string | null;
  client_message_id?: string | null;
};

export async function appendConversationMessage(
  accessToken: string,
  conversationPublicId: string,
  body: AppendConversationMessageBody,
): Promise<ConversationMessageDto> {
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
    log.warning(`appendConversationMessage: HTTP ${res.status}`);
    throw new Error(await readErrorMessage(res));
  }
  const data = (await res.json()) as { message?: ConversationMessageDto };
  if (!data.message) throw new Error("Invalid append message response");
  return data.message;
}
