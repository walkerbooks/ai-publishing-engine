import type { ReactNode } from "react";
import {
  DeskPathIllustration,
  StagesProgressIllustration,
} from "@/components/home/feature-story-illustrations";
import { cn } from "@/lib/utils/cn";

type StoryBandProps = {
  eyebrow: string;
  title: string;
  body: ReactNode;
  illustration: ReactNode;
  reverse?: boolean;
};

function StoryBand({
  eyebrow,
  title,
  body,
  illustration,
  reverse = false,
}: StoryBandProps) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-14">
      <div className={cn(reverse ? "lg:order-2" : "lg:order-1")}>{illustration}</div>
      <div className={cn("max-w-xl", reverse ? "lg:order-1" : "lg:order-2")}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-walker-teal">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-[2.15rem] lg:leading-snug">
          {title}
        </h2>
        <div className="mt-4 space-y-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          {body}
        </div>
      </div>
    </div>
  );
}

const sectionClass =
  "scroll-mt-[calc(3.5rem+0.125rem)] border-t border-border bg-walker-mist/40 px-4 py-12 dark:bg-walker-night/50 sm:scroll-mt-[calc(5rem+0.125rem)] sm:py-16";

/** First story band — sits above How it works. */
export function WelcomeStorySection() {
  return (
    <section id="welcome" className={sectionClass}>
      <div className="mx-auto max-w-5xl">
        <StoryBand
          eyebrow="Welcome to WalkerBook"
          title="The easiest way to write and publish a book"
          body={
            <>
              <p>
                WalkerBook is an AI-powered platform that helps you write a book with AI, shape a
                professional cover direction, and get an ebook-ready manuscript without the
                blank-page panic.
              </p>
              <p>
                Perfect for beginners and experienced authors: enter your idea in chat, and
                WalkerBook turns it into a complete, ready-to-sell book. You own all the rights. We
                just make the process fast, guided, and stress-free.
              </p>
            </>
          }
          illustration={<DeskPathIllustration />}
        />
      </div>
    </section>
  );
}

/** Second story band — after How it works. */
export function ProgressStorySection() {
  return (
    <section id="why-walkerbook" className={sectionClass}>
      <div className="mx-auto max-w-5xl">
        <StoryBand
          reverse
          eyebrow="WalkerBook"
          title="Become successful and start making progress"
          body={
            <p>
              Even if you’ve never written anything before, WalkerBook’s AI book generator helps
              anyone create and publish a book easily, including first-time authors. Chat your
              vision, lock an outline, preview a chapter, then walk out with a full manuscript you
              can sell on Amazon, Google Play, Apple Books, and more.
            </p>
          }
          illustration={<StagesProgressIllustration />}
        />
      </div>
    </section>
  );
}

/** @deprecated Prefer WelcomeStorySection + ProgressStorySection for placement control. */
export function FeatureStorySections() {
  return (
    <>
      <WelcomeStorySection />
      <ProgressStorySection />
    </>
  );
}
