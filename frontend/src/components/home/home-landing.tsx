"use client";

import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  Eye,
  ListOrdered,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const steps = [
  {
    icon: MessageCircle,
    title: "Tell us your vision",
    body: "Genre, audience, tone, and goals — a quick chat so we understand the book you want.",
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
    title: "Publish-ready path",
    body: "Move from idea to full manuscript with a guided workflow built for indie authors.",
  },
] as const;

export function HomeLanding() {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)]">
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-slate-50 via-white to-indigo-50/30">
        <div
          className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-[min(100%,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/20 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pb-20 pt-16 text-center sm:pb-24 sm:pt-20 lg:pt-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-3 py-1 text-xs font-medium uppercase tracking-widest text-indigo-700 shadow-sm backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden />
            Smith Book · AI publishing
          </p>

          <h1 className="text-balance text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Turn the book in your head into something readers can hold
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
            Chat through your idea, lock an outline, preview your voice, then grow it into a full
            manuscript — one friendly flow, no blank-page panic.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:mt-12">
            <Button
              asChild
              size="lg"
              className={cn(
                "group h-12 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 px-8 text-base font-semibold shadow-lg shadow-slate-900/20",
                "transition-all duration-200 hover:from-slate-800 hover:to-slate-700 hover:shadow-xl hover:shadow-slate-900/25",
                "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
              )}
            >
              <Link href="/chat" className="inline-flex items-center gap-2">
                Start your book in chat
                <ChevronRight
                  className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </Button>
            <p className="text-sm text-slate-500">
              Takes a minute to begin · You stay in control at every step
            </p>
          </div>
        </div>
      </section>

      <section className="relative bg-white px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              How your book comes to life
            </h2>
            <p className="mt-3 text-slate-600">
              Same journey you&apos;ll see in chat — clear stages, no guesswork.
            </p>
          </div>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <li key={title}>
                <article
                  className={cn(
                    "group relative flex h-full flex-col rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 shadow-sm",
                    "transition-all duration-200 hover:border-indigo-200 hover:bg-white hover:shadow-md",
                  )}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25 transition-transform duration-200 group-hover:scale-105">
                      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="text-xs font-bold text-indigo-600">Step {i + 1}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{body}</p>
                </article>
              </li>
            ))}
          </ul>

          <div className="mt-14 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 px-6 py-8 text-center sm:flex-row sm:px-10">
            <p className="max-w-md text-sm leading-relaxed text-slate-700 sm:text-left">
              <span className="font-semibold text-slate-900">Ready when you are.</span> Open chat,
              pick a quick start or describe your dream book — we&apos;ll meet you there.
            </p>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="shrink-0 rounded-xl border-slate-300 bg-white hover:bg-slate-50"
            >
              <Link href="/chat" className="inline-flex items-center gap-2">
                Open chat
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
