const KEY = "ai_pub_access_token";
const EMAIL_KEY = "ai_pub_user_email";
const FIRST_NAME_KEY = "ai_pub_user_first_name";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
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

/** Persists JWT, email, and optional first name (for header greeting). */
export function setAuthSession(token: string, email: string, firstName?: string | null): void {
  try {
    localStorage.setItem(KEY, token);
    localStorage.setItem(EMAIL_KEY, email);
    if (firstName != null && firstName !== "") {
      localStorage.setItem(FIRST_NAME_KEY, firstName);
    } else {
      localStorage.removeItem(FIRST_NAME_KEY);
    }
  } catch {
    /* private mode */
  }
}

export function setAccessToken(token: string): void {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    /* private mode */
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(FIRST_NAME_KEY);
  } catch {
    /* */
  }
}
