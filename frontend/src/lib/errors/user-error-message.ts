export type UserErrorContext =
  | "chat"
  | "cover"
  | "payment"
  | "export"
  | "pdf"
  | "outline"
  | "preview"
  | "auth"
  | "generic";

export type MappedUserError = {
  message: string;
  retryable: boolean;
  tone: "error" | "warning";
};

const NETWORK_HINTS = [
  "failed to fetch",
  "networkerror",
  "load failed",
  "network request failed",
  "upstream unreachable",
  "ai service unreachable",
  "connection reset",
  "econnrefused",
  "etimedout",
  "socket hang up",
];

const RETRYABLE_HINTS = [
  ...NETWORK_HINTS,
  "try again shortly",
  "too many ai requests",
  "too many requests",
  "service unavailable",
  "bad gateway",
  "gateway timeout",
  "temporarily unavailable",
  "timeout",
  "502",
  "503",
  "504",
  "429",
];

function rawMessage(raw: unknown): string {
  if (raw instanceof Error) return raw.message.trim();
  if (typeof raw === "string") return raw.trim();
  if (raw && typeof raw === "object" && "error" in raw) {
    const e = (raw as { error?: unknown }).error;
    if (typeof e === "string" && e.trim()) return e.trim();
  }
  return "";
}

function looksTechnical(message: string): boolean {
  const m = message.trim();
  if (!m) return false;
  const low = m.toLowerCase();

  if (low.includes("traceback") || low.includes("stack trace")) return true;
  if (/\.(ts|tsx|js|jsx|py):\d+/.test(m)) return true;
  if (low.includes("unexpected token") && low.includes("json")) return true;
  if (low.startsWith("{") && low.includes('"error"')) return true;
  if (m.length > 320 && (low.includes("exception") || low.includes("error:"))) return true;

  return false;
}

function includesAny(haystack: string, needles: string[]): boolean {
  const low = haystack.toLowerCase();
  return needles.some((n) => low.includes(n));
}

function defaultForContext(context: UserErrorContext, retryable: boolean): MappedUserError {
  const messages: Record<UserErrorContext, string> = {
    chat: "We couldn't get a reply right now. Please try again in a moment.",
    cover: "Cover art couldn't be generated. Please try again.",
    payment: "Checkout didn't start. Please try again or use a different payment method.",
    export: "Your PDF couldn't be prepared. Please try again shortly.",
    pdf: "We couldn't open your PDF preview. Try again or use Download PDF.",
    outline: "We couldn't build your outline. Please try again.",
    preview: "We couldn't generate your preview. Please try again.",
    auth: "Something went wrong. Please check your details and try again.",
    generic: "Something went wrong. Please try again.",
  };
  return {
    message: messages[context],
    retryable,
    tone: "error",
  };
}

function networkMessage(context: UserErrorContext): string {
  switch (context) {
    case "auth":
      return "We couldn't reach the server. Check your connection and try again.";
    case "payment":
      return "We couldn't reach the payment service. Check your connection and try again.";
    case "pdf":
      return "We couldn't load your PDF. Check your connection and try again.";
    default:
      return "We couldn't reach the server. Check your connection and try again.";
  }
}

function rateLimitMessage(context: UserErrorContext): string {
  if (context === "chat") {
    return "You're sending messages quickly. Wait a moment, then try again.";
  }
  return "Too many requests right now. Wait a moment, then try again.";
}

/**
 * Maps API / network / technical errors into short, user-facing copy.
 * Never surfaces stack traces, JSON blobs, or raw upstream logs.
 */
export function mapUserError(
  raw: unknown,
  context: UserErrorContext = "generic",
): MappedUserError {
  const message = rawMessage(raw);

  if (!message) {
    return defaultForContext(context, true);
  }

  if (includesAny(message, NETWORK_HINTS)) {
    return {
      message: networkMessage(context),
      retryable: true,
      tone: "error",
    };
  }

  const low = message.toLowerCase();
  if (
    low.includes("too many ai requests") ||
    low.includes("too many requests") ||
    /\b429\b/.test(low)
  ) {
    return {
      message: rateLimitMessage(context),
      retryable: true,
      tone: "error",
    };
  }

  if (looksTechnical(message)) {
    return defaultForContext(context, true);
  }

  if (/\b(502|503|504)\b/.test(low) || low.includes("bad gateway")) {
    return defaultForContext(context, true);
  }

  if (low.includes("session has expired") || low.includes("sign in again")) {
    return { message: message.slice(0, 280), retryable: false, tone: "error" };
  }

  if (
    low.includes("free guests can have") ||
    low.includes("sign in to save")
  ) {
    return { message: message.slice(0, 280), retryable: false, tone: "warning" };
  }

  const retryable = includesAny(message, RETRYABLE_HINTS);

  if (message.length > 280) {
    return defaultForContext(context, retryable || true);
  }

  return {
    message,
    retryable: retryable || context === "chat" || context === "cover",
    tone: "error",
  };
}

export function userErrorFromUnknown(
  err: unknown,
  context: UserErrorContext = "generic",
): MappedUserError {
  return mapUserError(err, context);
}

/** Convenience when only the message string is needed. */
export function userErrorMessage(
  err: unknown,
  context: UserErrorContext = "generic",
): string {
  return userErrorFromUnknown(err, context).message;
}
