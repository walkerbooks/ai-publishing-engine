import { GO_API_PREFIX, goAuthHeaders } from "@/lib/api/go-api";
import { throwIfGoResponseFailed } from "@/lib/api/go-response";
import { getLogger } from "@/lib/log";

const log = getLogger("admin-client");

export type AdminStatsResponse = {
  user_count: number;
  book_count: number;
};

export async function fetchAdminStats(accessToken: string): Promise<AdminStatsResponse> {
  const res = await fetch(`${GO_API_PREFIX}/v1/admin/stats`, {
    headers: goAuthHeaders(accessToken),
  });
  if (!res.ok) {
    log.warning(`admin/stats failed: HTTP ${res.status}`);
    await throwIfGoResponseFailed(res);
  }
  log.debug("admin/stats succeeded");
  return res.json() as Promise<AdminStatsResponse>;
}

export type BookFunnelRow = {
  book_public_id: string;
  title: string;
  status: string;
  user_email?: string | null;
  is_guest: boolean;
  created_at: string;
  updated_at: string;
};

export type BookFunnelResponse = {
  stage_order: string[];
  stage_labels: Record<string, string>;
  stage_descriptions?: Record<string, string>;
  /** PostgreSQL column backing the stage (enum `book_status`). */
  sql_status_column?: string;
  sql_status_enum?: string;
  funnel_explanation?: string;
  counts_by_status: Record<string, number>;
  total_books: number;
  rows: BookFunnelRow[];
  limit: number;
  offset: number;
  note?: string;
};

export async function fetchBookFunnel(
  accessToken: string,
  opts?: { limit?: number; offset?: number },
): Promise<BookFunnelResponse> {
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.offset != null) params.set("offset", String(opts.offset));
  const q = params.toString();
  const url = `${GO_API_PREFIX}/v1/admin/analytics/book-funnel${q ? `?${q}` : ""}`;
  const res = await fetch(url, { headers: goAuthHeaders(accessToken) });
  if (!res.ok) {
    log.warning(`admin book-funnel failed: HTTP ${res.status}`);
    await throwIfGoResponseFailed(res);
  }
  log.debug("admin book-funnel succeeded");
  return res.json() as Promise<BookFunnelResponse>;
}
