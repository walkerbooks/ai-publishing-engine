const KEY = "ai_pub_access_token";
const EMAIL_KEY = "ai_pub_user_email";
const FIRST_NAME_KEY = "ai_pub_user_first_name";
const ROLE_KEY = "ai_pub_user_role";

export type StoredUserRole = "user" | "admin";

export function normalizeUserRole(raw: string | null | undefined): StoredUserRole {
  return raw === "admin" ? "admin" : "user";
}

/** Strip wrapping quotes, whitespace, and accidental `Bearer ` prefix (breaks JWT parsing). */
function normalizeStoredJwt(raw: string): string {
  let t = raw.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    t = t.slice(1, -1).trim();
  }
  if (t.toLowerCase().startsWith("bearer ")) {
    t = t.slice(7).trim();
  }
  return t;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const t = normalizeStoredJwt(raw);
    return t.length > 0 ? t : null;
  } catch {
    return null;
  }
}

export function getUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

export function getUserFirstName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(FIRST_NAME_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function getUserRole(): StoredUserRole | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(ROLE_KEY);
    if (v === "admin" || v === "user") return v;
    return null;
  } catch {
    return null;
  }
}

/** Persists JWT, email, optional first name (for header greeting), and role. */
export function setAuthSession(
  token: string,
  email: string,
  firstName?: string | null,
  /** When set (including `"user"`), updates stored role. When omitted, existing role is left unchanged. */
  role?: StoredUserRole,
): void {
  try {
    const clean = normalizeStoredJwt(token);
    localStorage.setItem(KEY, clean);
    localStorage.setItem(EMAIL_KEY, email);
    if (firstName != null && firstName !== "") {
      localStorage.setItem(FIRST_NAME_KEY, firstName);
    } else {
      localStorage.removeItem(FIRST_NAME_KEY);
    }
    if (role !== undefined) {
      localStorage.setItem(ROLE_KEY, normalizeUserRole(role));
    }
  } catch {
    /* private mode */
  }
}

export function setAccessToken(token: string): void {
  try {
    localStorage.setItem(KEY, normalizeStoredJwt(token));
  } catch {
    /* private mode */
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(FIRST_NAME_KEY);
    localStorage.removeItem(ROLE_KEY);
  } catch {
    /* */
  }
}
