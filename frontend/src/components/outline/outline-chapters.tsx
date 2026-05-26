import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils/cn";

export type ChapterItem = {
  chapter_number: number;
  title: string;
  subtopics?: string[];
  word_target?: number;
};

type Props = {
  chapters: ChapterItem[];
};

/**
 * Stacked chapter cards: same structure in light and dark (muted panel + nested tiles),
 * matching the dark-theme outline hierarchy.
 */
export function OutlineChapters({ chapters }: Props) {
  return (
    <Accordion type="multiple" className="w-full space-y-2">
      {chapters.map((ch, i) => (
        <AccordionItem
          key={`${ch.chapter_number}-${i}`}
          value={`ch-${ch.chapter_number}-${i}`}
          className={cn(
            "border-0 rounded-lg border border-border/80 bg-slate-50/95 px-0 shadow-sm",
            "dark:border-walker-navy/25 dark:bg-walker-night dark:shadow-none",
          )}
        >
          <AccordionTrigger className="px-3 py-2.5 text-sm font-medium hover:no-underline">
            <span className="min-w-0 flex-1 pr-2 text-left">
              Ch{ch.chapter_number}: {ch.title}
              {ch.word_target != null ? (
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground sm:mt-0 sm:ml-1 sm:inline">
                  {ch.word_target.toLocaleString()} words
                </span>
              ) : null}
            </span>
          </AccordionTrigger>
          <AccordionContent className="border-t border-border/50 px-3 pt-1 text-muted-foreground">
            {(ch.subtopics ?? []).length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-foreground/85 dark:text-zinc-400">
                {(ch.subtopics ?? []).map((s, j) => (
                  <li key={j}>{s}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic text-muted-foreground">No subtopics listed.</p>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
