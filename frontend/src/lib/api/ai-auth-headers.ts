import { goAuthHeaders } from "@/lib/api/go-api";
import { getAccessToken } from "@/lib/auth/access-token";

/** Headers for same-origin `/api/ai` calls (Bearer from session). */
export function getAiAuthHeaders(): Record<string, string> {
  const t = getAccessToken();
  if (!t) return {};
  return Object.fromEntries(
    Object.entries(goAuthHeaders(t)).map(([k, v]) => [k, String(v)]),
  ) as Record<string, string>;
}
