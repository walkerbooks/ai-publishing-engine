import { clearAuthSession } from "@/lib/auth/access-token";
import { useAuthStore } from "@/stores/auth-store";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { createInitialPublishingState } from "@/stores/publishing-types";
import { usePublishingStore } from "@/stores/publishing-store";

const DEFAULT_PROMPT =
  "Your session has expired or is no longer valid. Please sign in again.";

/**
 * Clears JWT, marks the user logged out, resets chat/publishing state, and sets
 * `reloginPrompt` so the UI can open the login dialog with context.
 */
export function invalidateGoSession(serverMessage?: string) {
  const prompt =
    serverMessage && serverMessage.trim().length > 0
      ? serverMessage.trim()
      : DEFAULT_PROMPT;
  clearAuthSession();
  useAuthStore.setState({
    isAuthenticated: false,
    email: null,
    firstName: null,
    reloginPrompt: prompt,
  });
  useChatDirectoryStore.setState({
    conversations: [],
    activeConversationId: null,
    listLoaded: true,
  });
  usePublishingStore.setState(createInitialPublishingState());
}
