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
  /** Dark styling for chat outline sidecard / zinc surfaces */
  appearance?: "light" | "dark";
};

export function OutlineChapters({
  chapters,
  appearance = "light",
}: Props) {
  const dark = appearance === "dark";

  return (
    <Accordion type="multiple" className={cn("w-full", dark && "space-y-2")}>
      {chapters.map((ch, i) => (
        <AccordionItem
          key={`${ch.chapter_number}-${i}`}
          value={`ch-${ch.chapter_number}-${i}`}
          className={cn(
            dark
              ? "rounded-lg border border-white/10 bg-zinc-800/80 px-0"
              : "border-b border-slate-200",
          )}
        >
          <AccordionTrigger
            className={
              dark
                ? "px-3 py-2.5 text-sm font-medium text-zinc-100 hover:no-underline [&>svg]:text-zinc-500"
                : undefined
            }
          >
            <span className="min-w-0 flex-1 pr-2 text-left">
              Ch{ch.chapter_number}: {ch.title}
              {ch.word_target != null
                ? dark
                  ? (
                      <span className="mt-0.5 block text-xs font-normal text-zinc-500 sm:mt-0 sm:ml-1 sm:inline">
                        {ch.word_target.toLocaleString()} words
                      </span>
                    )
                  : ` — ${ch.word_target.toLocaleString()} words`
                : null}
            </span>
          </AccordionTrigger>
          <AccordionContent
            className={cn(dark && "border-t border-white/5 px-3 pt-1 text-zinc-300")}
          >
            {(ch.subtopics ?? []).length > 0 ? (
              <ul
                className={cn(
                  "list-disc space-y-1 pl-5",
                  dark ? "text-zinc-400" : "text-slate-700",
                )}
              >
                {(ch.subtopics ?? []).map((s, j) => (
                  <li key={j}>{s}</li>
                ))}
              </ul>
            ) : (
              <p
                className={cn(
                  "text-sm italic",
                  dark ? "text-zinc-500" : "text-slate-500",
                )}
              >
                No subtopics listed.
              </p>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
