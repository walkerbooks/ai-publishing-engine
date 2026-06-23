"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  Eye,
  ListOrdered,
  MessageCircle,
  Palette,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeFeedbackSection } from "@/components/home/home-feedback-section";
import { HomePricingSection } from "@/components/home/home-pricing-section";
import { TestimonialsCarousel } from "@/components/home/testimonials-carousel";
import { cn } from "@/lib/utils/cn";

const steps = [
  {
    icon: MessageCircle,
    title: "Tell us your vision",
    body: "Genre, audience, tone, and goals, plus a quick chat so we understand the book you want.",
  },
  {
    icon: ListOrdered,
    title: "Shape the outline",
    body: "Chapters, word targets, and structure you can refine before a single page is written.",
  },
  {
    icon: Eye,
    title: "Preview the magic",
    body: "See a real sample chapter and flow so you know the voice fits before you commit.",
  },
  {
    icon: BookOpen,
    title: "Publish ready path",
    body: "Move from idea to full manuscript with a guided workflow that fits real life, not just ideal weekends.",
  },
] as const;

const whyFeatures = [
  {
    icon: Wand2,
    title: "Coauthor, not autopilot",
    body: "WalkerBook nudges structure, voice, and pacing while you steer, so drafts feel like yours, not a template.",
  },
  {
    icon: Palette,
    title: "Covers that turn heads",
    body: "Spin up cover directions fast, iterate on mood and typography, and land a look that belongs on a real shelf.",
  },
  {
    icon: Zap,
    title: "Progress you can feel",
    body: "Outline, sample chapter, full manuscript, and each hop is visible, so momentum beats the blank page spiral.",
  },
  {
    icon: ShieldCheck,
    title: "Your book, your keys",
    body: "You keep ownership of what you create. We’re the workshop lights, and you walk out with the manuscript.",
  },
] as const;

export function HomeLanding() {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100dvh-5rem)]">
      <section className="relative overflow-hidden border-b border-walker-navy/15 bg-walker-signature-soft dark:border-white/10 dark:[background-image:none] dark:bg-walker-night">
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pt-10 pb-16 text-center sm:pt-12 sm:pb-20">
          {/*
            Transparent logo only — walkerbook-main.png has an opaque black plate behind the art.
          */}
          <div className="w-full max-w-lg leading-none">
            <Image
              src="/walkerbook/walkerbook-transparent.png"
              alt="WalkerBook — Where stories begin their journey"
              width={360}
              height={120}
              className="mx-auto block h-auto w-full max-w-sm sm:max-w-md dark:drop-shadow-[0_4px_28px_rgba(0,0,0,0.35)]"
              priority
            />
          </div>

          <div className="mt-8 flex w-full max-w-3xl flex-col items-center gap-4 sm:mt-10 sm:gap-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-walker-navy/20 bg-white/90 px-3 py-0.5 text-xs font-medium uppercase tracking-widest text-walker-navy shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-walker-navy/30 dark:text-walker-mist">
              <Sparkles className="h-3.5 w-3.5 text-walker-slate dark:text-walker-mist/90" aria-hidden />
              AI-assisted publishing
            </p>

            <h1 className="text-balance text-4xl font-semibold tracking-tight text-walker-charcoal dark:text-walker-mist sm:text-5xl lg:text-[3.25rem] lg:leading-[1.06]">
              Turn the book in your head into something readers can hold
            </h1>

            <p className="max-w-xl text-pretty text-base leading-snug text-walker-navy/90 dark:text-walker-mist/85 sm:text-lg sm:leading-relaxed">
              Chat through your idea, lock an outline, preview your voice, then grow it into a full
              manuscript — one friendly flow, no blank-page panic.
            </p>

            <div className="flex w-full flex-col items-center gap-4 pt-2 sm:gap-5 sm:pt-4">
              <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
              <Button
                asChild
                size="lg"
                className={cn(
                  "group h-12 w-full rounded-xl border-0 bg-walker-teal px-6 text-base font-semibold text-walker-charcoal shadow-lg shadow-black/20 sm:px-8 sm:whitespace-nowrap",
                  "transition-all duration-200 hover:bg-walker-teal hover:brightness-110 hover:shadow-xl hover:shadow-walker-teal/20",
                  "dark:bg-walker-teal dark:text-walker-charcoal dark:hover:bg-walker-teal dark:hover:brightness-110",
                  "focus-visible:ring-2 focus-visible:ring-walker-teal focus-visible:ring-offset-2 focus-visible:ring-offset-walker-mist dark:focus-visible:ring-offset-walker-charcoal",
                  "sm:w-auto sm:min-w-0",
                )}
              >
                <Link href="/chat?new=1" className="inline-flex items-center justify-center gap-2 sm:whitespace-nowrap">
                  Start your book in chat
                  <ChevronRight
                    className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className={cn(
                  "h-12 w-full rounded-xl border-walker-navy/35 bg-walker-mist/50 text-walker-navy backdrop-blur-sm",
                  "hover:border-walker-navy/50 hover:bg-walker-mist dark:border-walker-slate/40 dark:bg-transparent dark:text-walker-mist",
                  "dark:hover:border-walker-slate dark:hover:bg-walker-navy/25",
                  "sm:w-auto sm:min-w-[180px]",
                )}
              >
                <Link
                  href="/#how-it-works"
                  className="inline-flex items-center justify-center"
                  onClick={(e) => {
                    e.preventDefault();
                    const id = "how-it-works";
                    const el = document.getElementById(id);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                    if (typeof window !== "undefined") {
                      window.history.pushState(null, "", `${window.location.pathname}#${id}`);
                    }
                  }}
                >
                  How it works
                </Link>
              </Button>
              </div>
              <p className="text-sm text-walker-navy/80 dark:text-walker-slate">
                Takes a minute to begin · You stay in control at every step
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-[calc(3.5rem+0.125rem)] sm:scroll-mt-[calc(5rem+0.125rem)] relative bg-background px-4 py-10 sm:py-12"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              How your book comes to life
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Same journey you&apos;ll see in chat, with clear stages and no guesswork.
            </p>
          </div>

          <ul className="mt-7 grid gap-4 sm:grid-cols-2 sm:gap-4 lg:mt-8 lg:grid-cols-4 lg:gap-4">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <li key={title}>
                <article
                  className={cn(
                    "group relative flex h-full flex-col rounded-2xl border border-border bg-walker-mist/60 p-4 shadow-sm",
                    "transition-all duration-200 hover:border-walker-navy/25 hover:bg-background hover:shadow-md",
                    "dark:bg-muted/40 dark:hover:border-walker-slate/35",
                  )}
                >
                  <div className="mb-2 flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-walker-navy text-walker-mist shadow-md shadow-walker-navy/25 transition-transform duration-200 group-hover:scale-105">
                      <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wide text-walker-slate dark:text-walker-slate">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="why-walkerbook"
        className="bg-background px-4 pb-12 pt-8 sm:pb-16 sm:pt-10"
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-14 xl:gap-16">
            <div className="max-w-lg lg:mx-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-walker-teal dark:text-walker-teal">
                Why WalkerBook
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-walker-charcoal dark:text-walker-mist sm:text-4xl">
                Publishing help that actually fits your life
              </h2>
              <p className="mt-4 text-pretty text-base leading-relaxed text-walker-navy/90 dark:text-walker-mist/85 sm:text-lg">
                Most of us juggle day jobs, doubt, and crowded calendars. WalkerBook is built for that reality, with fast
                wins, honest guardrails, and a workflow that respects your voice from day one.
              </p>
            </div>

            <ul className="grid gap-8 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10 lg:mt-6">
              {whyFeatures.map(({ icon: Icon, title, body }) => (
                <li key={title}>
                  <article className="flex h-full flex-col bg-transparent py-1">
                    <div
                      className={cn(
                        "mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-200 text-walker-navy",
                        "dark:bg-walker-slate/40 dark:text-walker-mist",
                      )}
                    >
                      <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                    </div>
                    <h3 className="text-sm font-bold uppercase leading-snug tracking-wide text-walker-charcoal dark:text-walker-mist">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        aria-label="Start your book in chat"
        className="bg-background px-4 pb-16 pt-8 sm:pb-20 sm:pt-10"
      >
        <div className="mx-auto max-w-5xl">
          <div
            className={cn(
              "flex flex-col items-stretch justify-between gap-6 rounded-2xl border border-dashed border-white/20",
              "bg-walker-night px-6 py-8 text-center shadow-lg shadow-black/20 sm:flex-row sm:items-center sm:px-10 sm:text-left",
            )}
          >
            <p className="max-w-xl text-sm leading-relaxed text-walker-mist/90 sm:flex-1">
              <span className="font-semibold text-white">Ready when you are.</span>{" "}
              Open chat and describe your dream book, and we&apos;ll meet you there.
            </p>
            <Button
              asChild
              variant="outline"
              size="lg"
              className={cn(
                "shrink-0 self-center rounded-xl border-white/35 bg-transparent text-white",
                "hover:bg-white/10 hover:text-white sm:self-auto",
              )}
            >
              <Link href="/chat" className="inline-flex items-center gap-2">
                Open chat
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <TestimonialsCarousel />
      <HomePricingSection />
      <HomeFeedbackSection />
    </div>
  );
}
