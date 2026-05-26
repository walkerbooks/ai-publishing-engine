/**
 * Go often stores JSON/text blobs as base64 in API fields; raw JSON triggers
 * "illegal base64 data at input byte 0" when the server base64-decodes the body.
 */

export function utf8ToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function base64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Normalize API blob fields to UTF-8 text for JSON.parse / display.
 * Go may return strings (plain JSON, base64, or empty) or already-decoded JSON objects/arrays.
 */
export function decodeApiBlob(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object") {
    try {
      return JSON.stringify(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw !== "string") {
    return String(raw);
  }
  const t = raw.trim();
  if (t.startsWith("{") || t.startsWith("[")) return t;
  try {
    return base64ToUtf8(t.replace(/\s/g, ""));
  } catch {
    return t;
  }
}
