import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { getLogger } from "@/lib/log";

const log = getLogger("exports-client");

export type ExportFormat = "pdf";

/** Matches Go export row JSON (snake_case). */
export type ExportStatusPayload = {
  status: "queued" | "processing" | "ready" | "failed" | string;
  file_url?: string;
  error?: string;
};

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
  return res.json() as Promise<ExportStatusPayload>;
}

/** Resolved download link once `status === "ready"` (Go uses `file_url`). */
export function exportFileUrl(ex: ExportStatusPayload): string | undefined {
  const u = ex.file_url?.trim();
  return u || undefined;
}
