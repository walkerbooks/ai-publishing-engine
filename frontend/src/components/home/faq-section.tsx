"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_ITEMS } from "@/lib/constants/faq";
import { cn } from "@/lib/utils/cn";

export function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="scroll-mt-[calc(3.5rem+0.125rem)] border-t border-border bg-background px-4 py-16 sm:scroll-mt-[calc(5rem+0.125rem)] sm:py-20"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2
            id="faq-heading"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Frequently Asked Questions
          </h2>
          <p className="mt-2 text-xs font-semibold tracking-widest text-walker-slate dark:text-walker-slate">
            Everything you need to know about WalkerBook
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          className="mt-10 w-full sm:mt-12"
        >
          {FAQ_ITEMS.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className={cn(
                "border-border/70 dark:border-white/10",
                "first:border-t first:border-border/70 first:dark:border-white/10",
              )}
            >
              <AccordionTrigger className="py-4 text-left text-base font-medium hover:no-underline sm:py-5">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
