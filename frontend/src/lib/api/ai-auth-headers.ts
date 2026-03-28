import { getAccessToken } from "@/lib/auth/access-token";

/** Headers for same-origin `/api/ai` calls (Bearer from session). */
export function getAiAuthHeaders(): Record<string, string> {
  const t = getAccessToken();
  if (!t) return {};
  return { Authorization: `Bearer ${t}` };
}
