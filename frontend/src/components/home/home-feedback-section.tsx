"use client";

import { useState } from "react";
import { CheckCircle2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserErrorBanner } from "@/components/ui/user-error-banner";
import {
  submitFeedback,
  type FeedbackCategory,
} from "@/lib/api/feedback-client";
import { FeedbackVideoAttachment } from "@/components/home/feedback-video-attachment";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils/cn";

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: "general", label: "General feedback" },
  { value: "product", label: "Product experience" },
  { value: "bug", label: "Bug or issue" },
  { value: "feature", label: "Feature idea" },
  { value: "other", label: "Something else" },
];

const fieldClass =
  "flex w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-walker-teal/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "dark:border-white/15 dark:bg-walker-night/90 dark:text-zinc-100 dark:placeholder:text-zinc-500 " +
  "dark:focus-visible:ring-walker-teal/40 dark:focus-visible:ring-offset-walker-charcoal";

export function HomeFeedbackSection() {
  const authEmail = useAuthStore((s) => s.email);
  const authFirstName = useAuthStore((s) => s.firstName);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [message, setMessage] = useState("");
  const [name, setName] = useState(authFirstName ?? "");
  const [email, setEmail] = useState(authEmail ?? "");
  const [video, setVideo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await submitFeedback({
        category,
        message,
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        video,
      });
      setSubmitted(true);
      setMessage("");
      setVideo(null);
      if (!isAuthenticated) {
        setName("");
        setEmail("");
      }
      setCategory("general");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      id="feedback"
      aria-labelledby="feedback-heading"
      className="scroll-mt-[calc(3.5rem+0.125rem)] border-t border-border bg-walker-mist/40 px-4 py-16 dark:bg-walker-nightPanel/30 sm:scroll-mt-[calc(5rem+0.125rem)] sm:py-20"
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
          <div className="max-w-lg lg:pt-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-walker-teal dark:text-walker-teal">
              Feedback
            </p>
            <h2
              id="feedback-heading"
              className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Help us make WalkerBook better
            </h2>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
              Whether it&apos;s a rough edge in chat, a pricing question, or an idea for your next
              book — we read every note. Share anything on your mind.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <MessageCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-walker-teal"
                  aria-hidden
                />
                <span>Product bugs, confusing steps, or moments that felt great</span>
              </li>
              <li className="flex gap-3">
                <MessageCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-walker-teal"
                  aria-hidden
                />
                <span>Feature ideas for outlines, covers, exports, or pricing</span>
              </li>
              <li className="flex gap-3">
                <MessageCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-walker-teal"
                  aria-hidden
                />
                <span>Optional email if you&apos;d like us to follow up</span>
              </li>
              <li className="flex gap-3">
                <MessageCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-walker-teal"
                  aria-hidden
                />
                <span>Upload a clip or record a short video to show us what you mean</span>
              </li>
            </ul>
          </div>

          <div
            className={cn(
              "rounded-2xl border border-border bg-background/95 p-6 shadow-md",
              "dark:border-white/10 dark:bg-walker-night/80 dark:shadow-black/20 sm:p-8",
            )}
          >
            {submitted ? (
              <div className="flex flex-col items-center py-6 text-center sm:py-10">
                <CheckCircle2
                  className="h-12 w-12 text-walker-teal"
                  aria-hidden
                />
                <h3 className="mt-4 text-xl font-semibold text-foreground">
                  Thanks — we got your feedback
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Your message helps us improve WalkerBook for every author on the path.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-6 rounded-xl"
                  onClick={() => setSubmitted(false)}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <label htmlFor="feedback-category" className="text-sm font-medium text-foreground">
                    Topic
                  </label>
                  <select
                    id="feedback-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                    className={cn(fieldClass, "h-10 cursor-pointer")}
                    disabled={loading}
                  >
                    {CATEGORIES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="feedback-message" className="text-sm font-medium text-foreground">
                    Your feedback <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    id="feedback-message"
                    required
                    minLength={10}
                    maxLength={5000}
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={loading}
                    placeholder="Tell us what worked, what didn't, or what you'd love to see next…"
                    className={cn(fieldClass, "min-h-[140px] resize-y py-3 leading-relaxed")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {message.length}/5,000 characters · at least 10 required
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Video <span className="font-normal text-muted-foreground">(optional)</span>
                  </p>
                  <FeedbackVideoAttachment
                    video={video}
                    onVideoChange={setVideo}
                    disabled={loading}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="feedback-name" className="text-sm font-medium text-foreground">
                      Name <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <Input
                      id="feedback-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loading}
                      placeholder="How should we address you?"
                      className="rounded-xl focus-visible:ring-walker-teal/50 dark:focus-visible:ring-walker-teal/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="feedback-email" className="text-sm font-medium text-foreground">
                      Email <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <Input
                      id="feedback-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      placeholder="you@example.com"
                      className="rounded-xl focus-visible:ring-walker-teal/50 dark:focus-visible:ring-walker-teal/40"
                    />
                  </div>
                </div>

                {error ? (
                  <UserErrorBanner layout="polite" message={error} onDismiss={() => setError(null)} />
                ) : null}

                <Button
                  type="submit"
                  disabled={loading || message.trim().length < 10}
                  className={cn(
                    "h-12 w-full rounded-xl border-0 bg-walker-teal text-base font-semibold text-walker-charcoal shadow-md",
                    "hover:bg-walker-teal hover:brightness-110 disabled:opacity-60",
                    "dark:bg-walker-teal dark:text-walker-charcoal",
                  )}
                >
                  {loading ? (
                    "Sending…"
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Send feedback
                      <Send className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
