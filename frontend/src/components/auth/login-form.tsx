"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { login } from "@/lib/api/auth-client";
import { authErrorFromUnknown } from "@/lib/auth/auth-messages";
import { completeAuthNavigation } from "@/lib/auth/post-auth-navigation";
import { useAuthStore } from "@/stores/auth-store";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type LoginFormProps = {
  variant?: "page" | "dialog";
  /** Post-login navigation (dialog defaults to /chat). */
  redirectAfterLogin?: string;
  onAuthenticated?: () => void;
  onSwitchToSignup?: () => void;
};

export function LoginFormWithNextFromUrl() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  return (
    <LoginForm redirectAfterLogin={next && next.startsWith("/") ? next : "/chat"} variant="page" />
  );
}

export function LoginForm({
  variant = "page",
  redirectAfterLogin = "/chat",
  onAuthenticated,
  onSwitchToSignup,
}: LoginFormProps) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const reloginPrompt = useAuthStore((s) => s.reloginPrompt);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { access_token, user } = await login(email, password);
      setSession(access_token, user.email, user.first_name);
      completeAuthNavigation(router, {
        variant,
        redirectPath: redirectAfterLogin,
        onAuthenticated,
      });
    } catch (e) {
      setErr(authErrorFromUnknown(e, "login"));
    } finally {
      setLoading(false);
    }
  }

  const shellVariant = variant === "dialog" ? "dialog" : "page";

  return (
    <AuthFormShell title="Log in" variant={shellVariant}>
      <form onSubmit={(e) => void onSubmit(e)} className="min-w-0 space-y-4">
        {reloginPrompt ? (
          <p
            className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-50"
            role="status"
          >
            {reloginPrompt}
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground sm:text-base">
          Sign in to sync your account, pay for full books, and pick up where you left off.
        </p>
        {err ? (
          <p
            className="break-words text-sm text-red-600 dark:text-red-400"
            role="alert"
            aria-live="polite"
          >
            {err}
          </p>
        ) : null}
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Email</span>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 sm:h-10"
            required
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-foreground">Password</span>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 sm:h-10"
            required
            minLength={8}
          />
        </label>
        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full min-w-0 touch-manipulation sm:h-9 sm:w-auto"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        <p className="flex flex-wrap items-baseline gap-x-1 text-sm text-muted-foreground">
          No account?{" "}
          {variant === "dialog" && onSwitchToSignup ? (
            <button
              type="button"
              className="font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
              onClick={onSwitchToSignup}
            >
              Sign up
            </button>
          ) : (
            <Link
              href="/signup"
              className="font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
            >
              Sign up
            </Link>
          )}
        </p>
      </form>
    </AuthFormShell>
  );
}
