"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { AdminBookFunnel } from "@/components/admin/admin-book-funnel";
import { fetchAdminStats } from "@/lib/api/admin-client";
import { getAccessToken } from "@/lib/auth/access-token";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";

function formatCount(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function AdminDashboard() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const email = useAuthStore((s) => s.email);
  const profileRefreshOnce = useRef(false);

  useLayoutEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login?next=%2Fadmin");
      return;
    }
    if (role === null) {
      if (!profileRefreshOnce.current) {
        profileRefreshOnce.current = true;
        void refreshProfile();
      }
      return;
    }
    if (role !== "admin") {
      router.replace("/");
    }
  }, [isAuthenticated, role, refreshProfile, router]);

  const statsQuery = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const t = getAccessToken();
      if (!t) throw new Error("Not signed in");
      return fetchAdminStats(t);
    },
    enabled: role === "admin",
    staleTime: 30_000,
  });

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-16 text-sm text-slate-400">
        Redirecting to sign in…
      </div>
    );
  }

  if (role === null) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-16 text-sm text-slate-400">Loading…</div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-16 text-sm text-slate-400">Redirecting…</div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Walkerbook</p>
            <h1 className="text-lg font-semibold text-slate-50">Admin dashboard</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {email ? (
              <span className="text-slate-400" title={email}>
                {email}
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800"
              onClick={() => {
                logout();
                router.replace("/login");
              }}
            >
              Log out
            </Button>
            <Link
              href="/chat?app=1"
              className="text-sm font-medium text-teal-400/90 underline-offset-4 hover:text-teal-300 hover:underline"
            >
              Open app
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Analytics</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Snapshot of activity in the platform. Figures update when you refresh or reload this page.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-slate-700 bg-slate-900/80 text-slate-100 shadow-lg shadow-slate-950/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-slate-300">Registered users</CardTitle>
            </CardHeader>
            <CardContent>
              {statsQuery.isLoading ? (
                <p className="text-2xl font-semibold tabular-nums text-slate-500">…</p>
              ) : statsQuery.isError ? (
                <p className="text-sm text-red-400">Could not load stats.</p>
              ) : (
                <p className="text-3xl font-semibold tabular-nums tracking-tight text-teal-300">
                  {formatCount(statsQuery.data?.user_count ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-900/80 text-slate-100 shadow-lg shadow-slate-950/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-slate-300">Books (all)</CardTitle>
            </CardHeader>
            <CardContent>
              {statsQuery.isLoading ? (
                <p className="text-2xl font-semibold tabular-nums text-slate-500">…</p>
              ) : statsQuery.isError ? (
                <p className="text-sm text-red-400">Could not load stats.</p>
              ) : (
                <p className="text-3xl font-semibold tabular-nums tracking-tight text-teal-300">
                  {formatCount(statsQuery.data?.book_count ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {statsQuery.isError ? (
          <p className="mt-6 text-sm text-slate-500">
            <button
              type="button"
              className="font-medium text-teal-400 underline-offset-4 hover:underline"
              onClick={() => void statsQuery.refetch()}
            >
              Retry
            </button>
          </p>
        ) : null}

        <AdminBookFunnel />

        <section className="mt-14 border-t border-slate-800 pt-10">
          <h3 className="text-lg font-semibold text-slate-200">Suggested next metrics</h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Ideas for later: revenue / PayPal totals, conversation volume, generation job health,
            promotion signups.
          </p>
        </section>
      </main>
    </div>
  );
}
