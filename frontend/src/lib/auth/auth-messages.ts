/**
 * Turns API / network errors into short, user-facing copy (no stack traces).
 */

export function mapAuthApiError(message: string, flow: "login" | "signup"): string {
  const m = message.trim();
  const low = m.toLowerCase();

  if (
    low.includes("failed to fetch") ||
    low.includes("networkerror") ||
    low.includes("load failed") ||
    low === "network request failed" ||
    low.includes("upstream unreachable")
  ) {
    return "We couldn’t reach the server. Check your connection and that the API is running, then try again.";
  }

  if (flow === "login") {
    if (low.includes("invalid credentials")) {
      return "Incorrect email or password. Please try again.";
    }
  }

  if (flow === "signup") {
    if (
      low.includes("23505") ||
      low.includes("duplicate key") ||
      low.includes("unique constraint") ||
      low.includes("already exists")
    ) {
      return "An account with this email already exists. Log in or use a different email.";
    }
  }

  if (low.startsWith("validation failed") || low.includes("field validation")) {
    if (low.includes("first_name") || low.includes("firstname")) {
      return "Please enter your first name.";
    }
    if (low.includes("last_name") || low.includes("lastname")) {
      return "Please enter your last name.";
    }
    if (low.includes("email")) {
      return "Please enter a valid email address.";
    }
    if (low.includes("password")) {
      return "Password must be between 8 and 128 characters.";
    }
    return "Please check your details and try again.";
  }

  if (m.length > 280) {
    return `${m.slice(0, 240)}…`;
  }
  return m;
}

export function authErrorFromUnknown(err: unknown, flow: "login" | "signup"): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "Something went wrong.";
  return mapAuthApiError(raw, flow);
}
