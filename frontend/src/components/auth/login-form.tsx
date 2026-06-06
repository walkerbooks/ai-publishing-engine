"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import Link from "next/link";
import { authWithGoogle, login } from "@/lib/api/auth-client";
import {
  authErrorFromUnknown,
  isLoginCredentialError,
} from "@/lib/auth/auth-messages";
import {
  completeAuthNavigation,
  resolvePostAuthRedirectPath,
} from "@/lib/auth/post-auth-navigation";
import { useAuthStore } from "@/stores/auth-store";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export type LoginFormProps = {
  variant?: "page" | "dialog";
  /** Post-login navigation (dialog defaults to /chat). */
  redirectAfterLogin?: string;
  /**
   * When true (full-page login with no `?next=`), admins are sent to `/admin` instead of `/chat`.
   * Dialog logins should leave this false.
   */
  defaultConsumerLanding?: boolean;
  onAuthenticated?: () => void;
  onSwitchToSignup?: () => void;
};

export function LoginFormWithNextFromUrl() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const hasExplicitNext = Boolean(next && next.startsWith("/"));
  return (
    <LoginForm
      redirectAfterLogin={hasExplicitNext ? next! : "/chat"}
      defaultConsumerLanding={!hasExplicitNext}
      variant="page"
    />
  );
}

const CREDENTIAL_FIELD_CLASS =
  "border-red-500 focus-visible:ring-red-500/40 dark:border-red-500/70 dark:focus-visible:ring-red-500/35";

export function LoginForm({
  variant = "page",
  redirectAfterLogin = "/chat",
  defaultConsumerLanding = false,
  onAuthenticated,
  onSwitchToSignup,
}: LoginFormProps) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const reloginPrompt = useAuthStore((s) => s.reloginPrompt);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [credentialError, setCredentialError] = useState(false);
  const [shakeFields, setShakeFields] = useState(false);
  const [loading, setLoading] = useState(false);

  const clearFieldError = useCallback(() => {
    setCredentialError(false);
    setShakeFields(false);
    setErr(null);
  }, []);

  const handleAuthFailure = useCallback((error: unknown) => {
    const msg = authErrorFromUnknown(error, "login");
    setErr(msg);
    if (isLoginCredentialError(msg)) {
      setCredentialError(true);
      setShakeFields(false);
      requestAnimationFrame(() => setShakeFields(true));
      if (
        typeof window !== "undefined" &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        navigator.vibrate?.(50);
      }
    } else {
      setCredentialError(false);
      setShakeFields(false);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearFieldError();
    setLoading(true);
    try {
      const { access_token, user } = await login(email, password);
      setSession(access_token, user.email, user.first_name, user.role);
      const redirectPath = resolvePostAuthRedirectPath(redirectAfterLogin, user.role, {
        variant,
        defaultConsumerLanding,
      });
      completeAuthNavigation(router, {
        variant,
        redirectPath,
        onAuthenticated,
      });
    } catch (e) {
      handleAuthFailure(e);
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleCredential(idToken: string) {
    clearFieldError();
    setLoading(true);
    try {
      const { access_token, user } = await authWithGoogle(idToken);
      setSession(access_token, user.email, user.first_name, user.role);
      const redirectPath = resolvePostAuthRedirectPath(redirectAfterLogin, user.role, {
        variant,
        defaultConsumerLanding,
      });
      completeAuthNavigation(router, {
        variant,
        redirectPath,
        onAuthenticated,
      });
    } catch (e) {
      handleAuthFailure(e);
    } finally {
      setLoading(false);
    }
  }

  const shellVariant = variant === "dialog" ? "dialog" : "page";
  const showCredentialErr = credentialError && err;
  const showGeneralErr = err && !credentialError;

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
        {showGeneralErr ? (
          <p
            className="break-words text-sm text-red-600 dark:text-red-400"
            role="alert"
            aria-live="polite"
          >
            {err}
          </p>
        ) : null}
        <GoogleAuthButton
          intent="signin"
          disabled={loading}
          onCredential={(t) => void onGoogleCredential(t)}
        />
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <span className="w-full border-t border-slate-200 dark:border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase tracking-wide">
            <span className="bg-white/90 px-2 text-muted-foreground dark:bg-walker-night">
              Or continue with email
            </span>
          </div>
        </div>
        <div
          className={cn("space-y-4", shakeFields && "animate-login-shake")}
          onAnimationEnd={() => setShakeFields(false)}
        >
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Email</span>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (credentialError) clearFieldError();
              }}
              aria-invalid={credentialError}
              className={cn(
                "h-11 sm:h-10",
                credentialError && CREDENTIAL_FIELD_CLASS,
              )}
              required
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Password</span>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (credentialError) clearFieldError();
              }}
              aria-invalid={credentialError}
              className={cn(
                "h-11 sm:h-10",
                credentialError && CREDENTIAL_FIELD_CLASS,
              )}
              required
              minLength={8}
            />
            {showCredentialErr ? (
              <p
                className="text-sm text-red-600 dark:text-red-400"
                role="alert"
                aria-live="polite"
              >
                {err}
              </p>
            ) : null}
          </label>
        </div>
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
