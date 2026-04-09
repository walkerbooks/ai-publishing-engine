import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { getLogger } from "@/lib/log";

const log = getLogger("exports-client");

export type ExportFormat = "pdf";

/** Normalized export row (Go may emit snake_case or PascalCase). */
export type ExportStatusPayload = {
  status: "queued" | "processing" | "ready" | "failed" | string;
  file_url?: string;
  error?: string;
};

function coerceExportPayload(raw: unknown): ExportStatusPayload {
  if (!raw || typeof raw !== "object") {
    return { status: "" };
  }
  const r = raw as Record<string, unknown>;
  const str = (v: unknown): string =>
    typeof v === "string" ? v.trim() : "";
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = str(r[k]);
      if (v) return v;
    }
    return "";
  };
  const status = pick("status", "Status");
  const file_url = pick("file_url", "FileURL", "fileUrl", "FileUrl") || undefined;
  const error = pick("error", "Error") || undefined;
  return { status, ...(file_url ? { file_url } : {}), ...(error ? { error } : {}) };
}

async function readErrorMessage(res: Response): Promise<string> {
  const t = await res.text();
  const plain = t.trim();
  try {
    const j = JSON.parse(t) as { error?: string };
    if (j.error) return j.error;
  } catch {
    /* */
  }
  return plain || `Request failed: ${res.status}`;
}

/**
 * Ask the backend to build an export (e.g. PDF). Backend should enqueue work and return quickly.
 * Expected route: POST /v1/exports/request
 */
export async function requestBookExport(
  bookPublicId: string,
  format: ExportFormat,
  accessToken: string | null,
): Promise<void> {
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(accessToken ? goAuthHeaders(accessToken) : {}),
  };
  const res = await fetch(`${GO_API_PREFIX}/v1/exports/request`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ book_public_id: bookPublicId, format }),
  });
  if (!res.ok) {
    log.debug(`requestBookExport: HTTP ${res.status}`, { bookPublicId, format });
    throw new Error(await readErrorMessage(res));
  }
  /* Backend returns 202 Accepted — res.ok is still true. */
}

/**
 * Poll export readiness: GET /v1/exports/{bookPublicId}/{format}
 * 200: `{ status: queued|processing|ready|failed, file_url?, error? }`
 * 404: no row yet or not accessible — caller should keep polling after POST /exports/request.
 */
export async function getExportStatus(
  bookPublicId: string,
  format: ExportFormat,
  accessToken: string | null,
): Promise<ExportStatusPayload | null> {
  const headers: HeadersInit = { Accept: "application/json" };
  if (accessToken) Object.assign(headers, goAuthHeaders(accessToken));
  const res = await fetch(
    `${GO_API_PREFIX}/v1/exports/${encodeURIComponent(bookPublicId)}/${encodeURIComponent(format)}`,
    { headers, credentials: "include" },
  );
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    log.debug(`getExportStatus: HTTP ${res.status}`, { bookPublicId, format });
    throw new Error(await readErrorMessage(res));
  }
  const raw: unknown = await res.json();
  return coerceExportPayload(raw);
}

/** Resolved download link once `status === "ready"` (Go uses `file_url`). */
export function exportFileUrl(ex: ExportStatusPayload): string | undefined {
  const u = ex.file_url?.trim();
  return u || undefined;
}

export function exportPreviewUrl(bookPublicId: string, format: ExportFormat): string {
  return `${GO_API_PREFIX}/v1/exports/${encodeURIComponent(bookPublicId)}/${encodeURIComponent(format)}/preview`;
}
