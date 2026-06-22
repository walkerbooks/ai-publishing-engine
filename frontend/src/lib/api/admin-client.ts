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

export type FeedbackCategory = "general" | "product" | "bug" | "feature" | "other";

export type AdminFeedbackItem = {
  id: string;
  category: FeedbackCategory;
  message: string;
  name?: string | null;
  email?: string | null;
  user_id?: number | null;
  user_email?: string | null;
  guest_session_id?: string | null;
  client_ip?: string | null;
  user_agent?: string | null;
  has_video: boolean;
  video_mime_type?: string | null;
  video_size_bytes?: number | null;
  video_original_name?: string | null;
  video_download_url?: string | null;
  video_download_expires_in?: string | null;
  email_sent_at?: string | null;
  created_at: string;
};

export type AdminFeedbackListResponse = {
  items: AdminFeedbackItem[];
  total: number;
  limit: number;
  offset: number;
};

export type FetchAdminFeedbackOpts = {
  limit?: number;
  offset?: number;
  category?: FeedbackCategory | "";
};

export async function fetchAdminFeedback(
  accessToken: string,
  opts?: FetchAdminFeedbackOpts,
): Promise<AdminFeedbackListResponse> {
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.offset != null) params.set("offset", String(opts.offset));
  if (opts?.category) params.set("category", opts.category);
  const q = params.toString();
  const url = `${GO_API_PREFIX}/v1/admin/feedback${q ? `?${q}` : ""}`;
  const res = await fetch(url, { headers: goAuthHeaders(accessToken) });
  if (!res.ok) {
    log.warning(`admin/feedback list failed: HTTP ${res.status}`);
    await throwIfGoResponseFailed(res);
  }
  log.debug("admin/feedback list succeeded");
  return res.json() as Promise<AdminFeedbackListResponse>;
}

export async function fetchAdminFeedbackById(
  accessToken: string,
  id: string,
): Promise<AdminFeedbackItem> {
  const res = await fetch(`${GO_API_PREFIX}/v1/admin/feedback/${encodeURIComponent(id)}`, {
    headers: goAuthHeaders(accessToken),
  });
  if (!res.ok) {
    log.warning(`admin/feedback get failed: HTTP ${res.status}`);
    await throwIfGoResponseFailed(res);
  }
  log.debug("admin/feedback get succeeded");
  return res.json() as Promise<AdminFeedbackItem>;
}
