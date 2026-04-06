import { cn } from "@/lib/utils/cn";

type Props = {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Full page vs modal: dialog drops outer padding and uses a tighter heading. */
  variant?: "page" | "dialog";
};

/** Same card shell as PayPal flow / chat gate: bordered card, theme tokens, WalkerBook eyebrow. */
export function AuthFormShell({ title, children, className, variant = "page" }: Props) {
  if (variant === "dialog") {
    return (
      <div className={cn("min-w-0 space-y-4", className)}>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          WalkerBook · Account
        </p>
        <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-md px-4 sm:max-w-lg sm:px-6",
        "pt-8 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:pt-12 sm:pb-12",
        className,
      )}
    >
      <div className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-walker-night sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          WalkerBook · Account
        </p>
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
}
