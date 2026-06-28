"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { TESTIMONIALS } from "@/lib/constants/testimonials";
import { cn } from "@/lib/utils/cn";

function StarRow() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="text-walker-teal dark:text-walker-teal"
          aria-hidden
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function TestimonialsCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const count = TESTIMONIALS.length;

  const syncFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const slideWidth = el.clientWidth;
    if (slideWidth <= 0) return;
    const index = Math.round(el.scrollLeft / slideWidth);
    const clamped = Math.max(0, Math.min(count - 1, index));
    setActiveIndex(clamped);
  }, [count]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncFromScroll();
    el.addEventListener("scroll", syncFromScroll, { passive: true });
    const ro = new ResizeObserver(() => syncFromScroll());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", syncFromScroll);
      ro.disconnect();
    };
  }, [syncFromScroll]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const next = ((index % count) + count) % count;
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setActiveIndex(next);
      el.scrollTo({
        left: next * el.clientWidth,
        behavior: reduced ? "auto" : "smooth",
      });
    },
    [count],
  );

  const goPrev = () => scrollToIndex(activeIndex - 1);
  const goNext = () => scrollToIndex(activeIndex + 1);

  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="scroll-mt-[calc(3.5rem+0.125rem)] border-t border-border bg-walker-mist/40 px-4 py-16 dark:bg-walker-nightPanel/30 sm:scroll-mt-[calc(5rem+0.125rem)] sm:py-20"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-walker-slate dark:text-walker-slate">
            Testimonials
          </p>
          <h2
            id="testimonials-heading"
            className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Authors who walked the path
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            Real stories from people who turned an idea into a manuscript with WalkerBook.
          </p>
        </div>

        <div className="relative mt-10 sm:mt-12">
          <div
            ref={scrollerRef}
            className={cn(
              "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain",
              "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
              "touch-pan-x motion-reduce:scroll-auto scroll-smooth",
            )}
            role="region"
            aria-roledescription="carousel"
            aria-label="Author testimonials"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                goPrev();
              } else if (e.key === "ArrowRight") {
                e.preventDefault();
                goNext();
              }
            }}
          >
            {TESTIMONIALS.map((t, i) => (
              <article
                key={t.id}
                className="w-full shrink-0 snap-center snap-always px-1 sm:px-2"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={i !== activeIndex}
              >
                <div
                  className={cn(
                    "mx-auto flex h-full max-w-2xl flex-col rounded-2xl border border-border bg-background/95 p-6 shadow-md",
                    "dark:border-white/10 dark:bg-walker-night/80 dark:shadow-black/20",
                    "sm:p-8",
                  )}
                >
                  <Quote
                    className="h-8 w-8 shrink-0 text-walker-teal/80"
                    aria-hidden
                  />
                  <blockquote className="mt-4 flex-1">
                    <p className="text-pretty text-base leading-relaxed text-foreground sm:text-lg">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </blockquote>
                  <footer className="mt-6 flex flex-col gap-2 border-t border-border/70 pt-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 text-left">
                      <p className="font-semibold text-foreground">{t.name}</p>
                      <p className="text-sm text-muted-foreground">{t.role}</p>
                      {t.book ? (
                        <p className="mt-0.5 text-sm font-medium text-walker-navy dark:text-walker-teal">
                          {t.book}
                        </p>
                      ) : null}
                    </div>
                    <StarRow />
                  </footer>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-3 sm:mt-8">
            <button
              type="button"
              onClick={goPrev}
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm transition",
                "hover:border-walker-teal/40 hover:bg-walker-mist/80",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-walker-teal focus-visible:ring-offset-2",
                "dark:border-white/15 dark:bg-walker-night dark:hover:bg-walker-nightPanel",
                "touch-manipulation",
              )}
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>

            <div
              className="flex flex-wrap items-center justify-center gap-2"
              role="tablist"
              aria-label="Choose testimonial"
            >
              {TESTIMONIALS.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={i === activeIndex}
                  aria-label={`Show testimonial from ${t.name}`}
                  onClick={() => scrollToIndex(i)}
                  className={cn(
                    "h-2.5 rounded-full transition-all touch-manipulation",
                    i === activeIndex
                      ? "w-7 bg-walker-teal"
                      : "w-2.5 bg-walker-navy/25 hover:bg-walker-navy/40 dark:bg-white/25 dark:hover:bg-white/40",
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={goNext}
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-background shadow-sm transition",
                "hover:border-walker-teal/40 hover:bg-walker-mist/80",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-walker-teal focus-visible:ring-offset-2",
                "dark:border-white/15 dark:bg-walker-night dark:hover:bg-walker-nightPanel",
                "touch-manipulation",
              )}
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground sm:hidden">
            Swipe left or right to browse
          </p>
        </div>
      </div>
    </section>
  );
}
