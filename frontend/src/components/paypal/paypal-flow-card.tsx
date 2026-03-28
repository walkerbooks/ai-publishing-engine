import { cn } from "@/lib/utils/cn";

type Props = {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * Matches chat gate / composer panels: bordered card, theme tokens, Smith Book eyebrow.
 */
export function PayPalFlowCard({
  eyebrow = "Smith Book · Payment",
  title,
  children,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-md px-4 sm:max-w-2xl sm:px-6",
        "pt-8 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:pt-12 sm:pb-12",
        className,
      )}
    >
      <div className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/60 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        <div className="min-w-0 space-y-4">{children}</div>
      </div>
    </div>
  );
}
