/**
 * Turns API / network errors into short, user-facing copy (no stack traces).
 */

import { mapUserError } from "@/lib/errors/user-error-message";

export const LOGIN_CREDENTIAL_ERROR_MESSAGE =
  "Incorrect email or password. Please try again.";

function isRawLoginCredentialFailure(low: string): boolean {
  return (
    low.includes("invalid credentials") ||
    low.includes("no rows in result set") ||
    low.includes("no rows") ||
    low.includes("record not found") ||
    low.includes("user not found") ||
    low.includes("wrong password") ||
    low.includes("incorrect password") ||
    low.includes("authentication failed")
  );
}

/** True when the mapped message is a wrong-email/password case (field shake UX). */
export function isLoginCredentialError(message: string): boolean {
  const low = message.trim().toLowerCase();
  return (
    low === LOGIN_CREDENTIAL_ERROR_MESSAGE.toLowerCase() ||
    isRawLoginCredentialFailure(low)
  );
}

export function mapAuthApiError(message: string, flow: "login" | "signup"): string {
  const m = message.trim();
  const low = m.toLowerCase();

  if (flow === "login" && isRawLoginCredentialFailure(low)) {
    return LOGIN_CREDENTIAL_ERROR_MESSAGE;
  }

  if (
    flow === "signup" &&
    (low.includes("23505") ||
      low.includes("duplicate key") ||
      low.includes("unique constraint") ||
      low.includes("already exists"))
  ) {
    return "An account with this email already exists. Log in or use a different email.";
  }

  if (low.includes("google sign-in is not configured")) {
    return "Google sign-in isn’t set up on the server yet. Use email and password, or contact support.";
  }
  if (low.includes("invalid google credential")) {
    return "Google sign-in didn’t work. Close any pop-ups and try again.";
  }
  if (low.includes("already linked to another google account")) {
    return "This email is already linked to a different Google account.";
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

  return mapUserError(m, "auth").message;
}

export function authErrorFromUnknown(err: unknown, flow: "login" | "signup"): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "Something went wrong.";
  return mapAuthApiError(raw, flow);
}
