import { useAuthStore } from "@/stores/auth-store";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";

/**
 * Guests do not restore chat from localStorage. After bootstrap / logout, mark the sidebar
 * list as ready so the UI does not wait on a server list (guests have none).
 */
export function hydrateGuestStoresFromPersistence(): void {
  if (useAuthStore.getState().isAuthenticated) return;
  useChatDirectoryStore.setState({ listLoaded: true });
}
