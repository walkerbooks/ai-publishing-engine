"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Film, MessageSquare, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  fetchAdminFeedback,
  fetchAdminFeedbackById,
  type AdminFeedbackItem,
  type FeedbackCategory,
} from "@/lib/api/admin-client";
import { getAccessToken } from "@/lib/auth/access-token";
import { formatFeedbackVideoSize } from "@/lib/feedback/video-limits";
import { UserErrorBanner } from "@/components/ui/user-error-banner";
import { cn } from "@/lib/utils/cn";

const PAGE_SIZE = 50;

const CATEGORY_OPTIONS: { value: FeedbackCategory | ""; label: string }[] = [
  { value: "", label: "All topics" },
  { value: "general", label: "General" },
  { value: "product", label: "Product" },
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "other", label: "Other" },
];

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  general: "General",
  product: "Product",
  bug: "Bug",
  feature: "Feature",
  other: "Other",
};

function formatDt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

function senderLabel(item: Pick<AdminFeedbackItem, "name" | "email" | "user_email">): string {
  if (item.name?.trim()) return item.name.trim();
  if (item.email?.trim()) return item.email.trim();
  if (item.user_email?.trim()) return item.user_email.trim();
  return "Anonymous";
}

function FeedbackDetailPanel({
  item,
  loading,
  onClose,
}: {
  item: AdminFeedbackItem | undefined;
  loading: boolean;
  onClose: () => void;
}) {
  if (!item && !loading) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92dvh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-700 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Feedback</p>
            <h4 id="feedback-detail-title" className="mt-1 text-lg font-semibold text-slate-50">
              {item ? CATEGORY_LABELS[item.category] : "Loading…"}
            </h4>
            {item ? (
              <p className="mt-0.5 text-xs text-slate-500">{formatDt(item.created_at)}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading && !item ? (
            <p className="text-sm text-slate-500">Loading submission…</p>
          ) : item ? (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Message</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                  {item.message}
                </p>
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">From</dt>
                  <dd className="mt-0.5 text-slate-200">{senderLabel(item)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Contact email</dt>
                  <dd className="mt-0.5 text-slate-200">{item.email?.trim() || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Account email</dt>
                  <dd className="mt-0.5 text-slate-200">{item.user_email?.trim() || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">User ID</dt>
                  <dd className="mt-0.5 font-mono text-xs text-slate-300">
                    {item.user_id ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Client IP</dt>
                  <dd className="mt-0.5 font-mono text-xs text-slate-300">
                    {item.client_ip || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Admin email sent</dt>
                  <dd className="mt-0.5 text-slate-200">{formatDt(item.email_sent_at)}</dd>
                </div>
              </dl>

              {item.user_agent ? (
                <div>
                  <p className="text-xs text-slate-500">User agent</p>
                  <p className="mt-1 break-all text-xs text-slate-400">{item.user_agent}</p>
                </div>
              ) : null}

              {item.has_video ? (
                <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <Film className="h-4 w-4 text-teal-400" aria-hidden />
                    Video attachment
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {item.video_original_name || "video"}
                    {item.video_size_bytes
                      ? ` · ${formatFeedbackVideoSize(item.video_size_bytes)}`
                      : ""}
                    {item.video_mime_type ? ` · ${item.video_mime_type}` : ""}
                  </p>
                  {item.video_download_url ? (
                    <>
                      {item.video_download_expires_in ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Link expires in {item.video_download_expires_in}
                        </p>
                      ) : null}
                      <div className="mt-3 overflow-hidden rounded-lg border border-slate-800 bg-black">
                        <video
                          src={item.video_download_url}
                          controls
                          playsInline
                          className="max-h-64 w-full object-contain"
                        />
                      </div>
                      <a
                        href={item.video_download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-400 hover:text-teal-300"
                      >
                        Open / download video
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-amber-400/90">
                      Video is stored but no download URL is available (check R2 configuration).
                    </p>
                  )}
                </div>
              ) : null}

              <p className="font-mono text-[10px] text-slate-600">ID: {item.id}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AdminFeedback() {
  const [offset, setOffset] = useState(0);
  const [category, setCategory] = useState<FeedbackCategory | "">("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ["admin", "feedback", offset, category],
    queryFn: async () => {
      const t = getAccessToken();
      if (!t) throw new Error("Not signed in");
      return fetchAdminFeedback(t, {
        limit: PAGE_SIZE,
        offset,
        category: category || undefined,
      });
    },
    staleTime: 20_000,
  });

  const detailQuery = useQuery({
    queryKey: ["admin", "feedback", "detail", selectedId],
    queryFn: async () => {
      const t = getAccessToken();
      if (!t || !selectedId) throw new Error("Not signed in");
      return fetchAdminFeedbackById(t, selectedId);
    },
    enabled: Boolean(selectedId),
    staleTime: 0,
  });

  const data = listQuery.data;
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  const listPreview = useMemo(() => data?.items ?? [], [data?.items]);

  return (
    <section className="mt-14 border-t border-slate-800 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
            <MessageSquare className="h-5 w-5 text-teal-400/90" aria-hidden />
            User feedback
          </h3>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Submissions from the homepage feedback form, including optional video uploads stored in
            Cloudflare R2.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          Filter by topic
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as FeedbackCategory | "");
              setOffset(0);
            }}
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {listQuery.isLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading feedback…</p>
      ) : listQuery.isError ? (
        <UserErrorBanner
          layout="polite"
          surface="inverted"
          className="mt-6"
          message="We couldn't load feedback submissions right now."
          retryable
          onRetry={() => void listQuery.refetch()}
          dismissLabel="Not now"
        />
      ) : data ? (
        <>
          <div className="mt-8 overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/90">
                  <th className="px-3 py-2.5 font-medium text-slate-400">Submitted</th>
                  <th className="px-3 py-2.5 font-medium text-slate-400">Topic</th>
                  <th className="px-3 py-2.5 font-medium text-slate-400">Message</th>
                  <th className="px-3 py-2.5 font-medium text-slate-400">From</th>
                  <th className="px-3 py-2.5 font-medium text-slate-400">Video</th>
                </tr>
              </thead>
              <tbody>
                {listPreview.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      No feedback yet.
                    </td>
                  </tr>
                ) : (
                  listPreview.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "cursor-pointer border-b border-slate-800/80 hover:bg-slate-900/50",
                        selectedId === row.id && "bg-slate-900/70",
                      )}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">
                        {formatDt(row.created_at)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">
                        {CATEGORY_LABELS[row.category]}
                      </td>
                      <td className="max-w-xs px-3 py-2.5 text-slate-300" title={row.message}>
                        {truncate(row.message, 120)}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-2.5 text-slate-400" title={senderLabel(row)}>
                        {senderLabel(row)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {row.has_video ? (
                          <span className="inline-flex items-center gap-1 text-teal-400/90">
                            <Film className="h-3.5 w-3.5" aria-hidden />
                            Yes
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > PAGE_SIZE ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
              <span>
                Showing {from}–{to} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!canPrev || listQuery.isFetching}
                  className="rounded-md border border-slate-600 px-3 py-1.5 text-slate-200 enabled:hover:bg-slate-800 disabled:opacity-40"
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!canNext || listQuery.isFetching}
                  className="rounded-md border border-slate-600 px-3 py-1.5 text-slate-200 enabled:hover:bg-slate-800 disabled:opacity-40"
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : total > 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {total} submission{total === 1 ? "" : "s"}
            </p>
          ) : null}
        </>
      ) : null}

      {selectedId ? (
        <FeedbackDetailPanel
          item={detailQuery.data}
          loading={detailQuery.isLoading}
          onClose={() => setSelectedId(null)}
        />
      ) : null}

      {detailQuery.isError && selectedId ? (
        <UserErrorBanner
          layout="polite"
          surface="inverted"
          className="mt-4"
          message="Could not load feedback details."
          retryable
          onRetry={() => void detailQuery.refetch()}
          onDismiss={() => setSelectedId(null)}
          dismissLabel="Close"
        />
      ) : null}
    </section>
  );
}
