import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-foreground " +
          "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 " +
          "focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
          "dark:border-white/15 dark:bg-walker-night/90 dark:text-zinc-100 dark:placeholder:text-zinc-500 " +
          "dark:focus-visible:ring-zinc-500 dark:focus-visible:ring-offset-zinc-950",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
