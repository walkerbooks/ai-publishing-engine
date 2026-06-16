"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn("h-9 w-[4.5rem] rounded-lg border border-border bg-muted/40", className)}
        aria-hidden
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border bg-muted/40 p-0.5",
        className,
      )}
      role="group"
      aria-label="Theme"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "flex h-9 w-10 touch-manipulation items-center justify-center rounded-md text-sm transition-colors",
          !isDark
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={!isDark}
        aria-label="Light theme"
      >
        <Sun className="h-4 w-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "flex h-9 w-10 touch-manipulation items-center justify-center rounded-md text-sm transition-colors",
          isDark
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
        aria-pressed={isDark}
        aria-label="Dark theme"
      >
        <Moon className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
