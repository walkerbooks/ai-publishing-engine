import { WELCOME_TEXT, WELCOME_OPTIONS } from "@/lib/constants/welcome";
import { Button } from "@/components/ui/button";

type Props = { onPick: (option: string) => void };

export function ChatWelcome({ onPick }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-800 dark:border-slate-700 dark:bg-zinc-900/50 dark:text-zinc-100">
        {WELCOME_TEXT}
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">Choose an option:</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {WELCOME_OPTIONS.map((opt) => (
          <Button
            key={opt}
            variant="outline"
            className="h-auto whitespace-normal py-3 text-center"
            onClick={() => onPick(opt)}
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
}
