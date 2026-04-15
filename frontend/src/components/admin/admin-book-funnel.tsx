"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fetchBookFunnel } from "@/lib/api/admin-client";
import { getAccessToken } from "@/lib/auth/access-token";

const PAGE_SIZE = 50;

function formatDt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function AdminBookFunnel() {
  const [offset, setOffset] = useState(0);

  const q = useQuery({
    queryKey: ["admin", "book-funnel", offset],
    queryFn: async () => {
      const t = getAccessToken();
      if (!t) throw new Error("Not signed in");
      return fetchBookFunnel(t, { limit: PAGE_SIZE, offset });
    },
    staleTime: 20_000,
  });

  const data = q.data;
  const maxCount = useMemo(() => {
    if (!data?.counts_by_status) return 1;
    let m = 1;
    for (const k of Object.keys(data.counts_by_status)) {
      const n = data.counts_by_status[k] ?? 0;
      if (n > m) m = n;
    }
    return m;
  }, [data?.counts_by_status]);

  const total = data?.total_books ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <section className="mt-14 border-t border-slate-800 pt-10">
      <h3 className="text-lg font-semibold text-slate-200">Book pipeline (where users stop)</h3>
      <p className="mt-2 max-w-3xl text-sm text-slate-400">
        <span className="text-slate-300">How this works:</span> each book has one row in Postgres. The
        stage comes from column{" "}
        <code className="rounded bg-slate-800 px-1 py-0.5 text-xs text-teal-300/90">
          {data?.sql_status_column ?? "books.status"}
        </code>{" "}
        (enum{" "}
        <code className="rounded bg-slate-800 px-1 py-0.5 text-xs text-slate-400">
          {data?.sql_status_enum ?? "book_status"}
        </code>
        ). That value is the <strong className="font-medium text-slate-300">last step the backend saved</strong>,
        not every UI click. Below, plain English is mapped from those SQL values.
      </p>
      {data?.funnel_explanation ? (
        <p className="mt-2 max-w-3xl text-sm text-slate-500">{data.funnel_explanation}</p>
      ) : null}
      {data?.note ? <p className="mt-2 text-xs text-slate-500">{data.note}</p> : null}

      {q.isLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading funnel…</p>
      ) : q.isError ? (
        <p className="mt-6 text-sm text-red-400">Could not load book funnel.</p>
      ) : data ? (
        <>
          <div className="mt-8 space-y-3">
            {data.stage_order.map((status) => {
              const n = data.counts_by_status[status] ?? 0;
              const label = data.stage_labels[status] ?? status;
              const desc = data.stage_descriptions?.[status];
              const pct = maxCount > 0 ? Math.round((n / maxCount) * 100) : 0;
              return (
                <div key={status}>
                  <div
                    className="flex justify-between gap-3 text-xs text-slate-400 sm:text-sm"
                    title={desc ?? label}
                  >
                    <span className="min-w-0 truncate font-medium text-slate-300">{label}</span>
                    <span className="shrink-0 tabular-nums text-slate-400">{n}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-teal-500/80"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/90">
                  <th className="px-3 py-2.5 font-medium text-slate-400">Account</th>
                  <th className="px-3 py-2.5 font-medium text-slate-400">Book</th>
                  <th className="px-3 py-2.5 font-medium text-slate-400">
                    <span className="block">Stage</span>
                    <span className="mt-0.5 block text-[10px] font-normal normal-case text-slate-500">
                      mapped from DB
                    </span>
                  </th>
                  <th className="px-3 py-2.5 font-medium text-slate-400">Last activity</th>
                  <th className="px-3 py-2.5 font-medium text-slate-400">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      No books yet.
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row) => {
                    const label = data.stage_labels[row.status] ?? row.status;
                    const stageDesc = data.stage_descriptions?.[row.status];
                    const account =
                      row.user_email && row.user_email.length > 0
                        ? row.user_email
                        : row.is_guest
                          ? "Guest (not signed in)"
                          : "—";
                    return (
                      <tr
                        key={row.book_public_id}
                        className="border-b border-slate-800/80 hover:bg-slate-900/50"
                      >
                        <td className="max-w-[200px] truncate px-3 py-2.5 text-slate-300" title={account}>
                          {account}
                        </td>
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/chat?app=1&book=${encodeURIComponent(row.book_public_id)}`}
                            className="font-medium text-teal-400/95 underline-offset-2 hover:text-teal-300 hover:underline"
                          >
                            {row.title}
                          </Link>
                          <div className="mt-0.5 font-mono text-[10px] text-slate-500">{row.book_public_id}</div>
                        </td>
                        <td className="max-w-[min(100vw,22rem)] px-3 py-2.5 align-top text-slate-300">
                          <div className="font-medium text-slate-200">{label}</div>
                          {stageDesc ? (
                            <p className="mt-1 text-xs leading-snug text-slate-500">{stageDesc}</p>
                          ) : null}
                          <div className="mt-1 font-mono text-[10px] text-slate-600" title="Raw SQL enum value">
                            {row.status}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">
                          {formatDt(row.updated_at)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">
                          {formatDt(row.created_at)}
                        </td>
                      </tr>
                    );
                  })
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
                  disabled={!canPrev || q.isFetching}
                  className="rounded-md border border-slate-600 px-3 py-1.5 text-slate-200 enabled:hover:bg-slate-800 disabled:opacity-40"
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!canNext || q.isFetching}
                  className="rounded-md border border-slate-600 px-3 py-1.5 text-slate-200 enabled:hover:bg-slate-800 disabled:opacity-40"
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
