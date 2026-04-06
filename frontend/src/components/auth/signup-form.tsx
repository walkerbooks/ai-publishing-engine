"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { authWithGoogle, signup } from "@/lib/api/auth-client";
import { authErrorFromUnknown } from "@/lib/auth/auth-messages";
import { completeAuthNavigation } from "@/lib/auth/post-auth-navigation";
import { useAuthStore } from "@/stores/auth-store";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type SignupFormProps = {
  variant?: "page" | "dialog";
  redirectAfterSignup?: string;
  onAuthenticated?: () => void;
  onSwitchToLogin?: () => void;
};

export function SignupFormWithNextFromUrl() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  return (
    <SignupForm
      redirectAfterSignup={next && next.startsWith("/") ? next : "/chat"}
      variant="page"
    />
  );
}

export function SignupForm({
  variant = "page",
  redirectAfterSignup = "/chat",
  onAuthenticated,
  onSwitchToLogin,
}: SignupFormProps) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { access_token, user } = await signup(email, password, firstName.trim(), lastName.trim());
      setSession(access_token, user.email, user.first_name);
      completeAuthNavigation(router, {
        variant,
        redirectPath: redirectAfterSignup,
        onAuthenticated,
      });
    } catch (e) {
      setErr(authErrorFromUnknown(e, "signup"));
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleCredential(idToken: string) {
    setErr(null);
    setLoading(true);
    try {
      const { access_token, user } = await authWithGoogle(idToken);
      setSession(access_token, user.email, user.first_name);
      completeAuthNavigation(router, {
        variant,
        redirectPath: redirectAfterSignup,
        onAuthenticated,
      });
    } catch (e) {
      setErr(authErrorFromUnknown(e, "signup"));
    } finally {
      setLoading(false);
    }
  }

  const shellVariant = variant === "dialog" ? "dialog" : "page";

  return (
    <AuthFormShell title="Sign up" variant={shellVariant}>
      <form onSubmit={(e) => void onSubmit(e)} className="min-w-0 space-y-4">
        <p className="text-sm text-muted-foreground sm:text-base">
          Create your account to keep your books in one place
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
        <GoogleAuthButton
          intent="signup"
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
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">First name</span>
            <Input
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-11 sm:h-10"
              required
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-foreground">Last name</span>
            <Input
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-11 sm:h-10"
              required
            />
          </label>
        </div>
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
          <span className="font-medium text-foreground">Password (8+ chars)</span>
          <Input
            type="password"
            autoComplete="new-password"
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
          {loading ? "Creating account…" : "Create account"}
        </Button>
        <p className="flex flex-wrap items-baseline gap-x-1 text-sm text-muted-foreground">
          Already have an account?{" "}
          {variant === "dialog" && onSwitchToLogin ? (
            <button
              type="button"
              className="font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
              onClick={onSwitchToLogin}
            >
              Log in
            </button>
          ) : (
            <Link
              href="/login"
              className="font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
            >
              Log in
            </Link>
          )}
        </p>
      </form>
    </AuthFormShell>
  );
}
