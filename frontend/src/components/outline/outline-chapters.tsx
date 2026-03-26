import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type ChapterItem = {
  chapter_number: number;
  title: string;
  subtopics?: string[];
  word_target?: number;
};

type Props = { chapters: ChapterItem[] };

export function OutlineChapters({ chapters }: Props) {
  return (
    <Accordion type="multiple" className="w-full">
      {chapters.map((ch) => (
        <AccordionItem key={ch.chapter_number} value={String(ch.chapter_number)}>
          <AccordionTrigger>
            Ch{ch.chapter_number}: {ch.title}
            {ch.word_target != null ? ` — ${ch.word_target.toLocaleString()} words` : ""}
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-1 pl-5 text-slate-700">
              {(ch.subtopics ?? []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
