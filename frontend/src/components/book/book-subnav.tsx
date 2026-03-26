"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type Props = { bookId: string };

const steps = [
  { href: (id: string) => `/book/${id}/outline`, label: "Outline" },
  { href: (id: string) => `/book/${id}/preview`, label: "Preview" },
  { href: (id: string) => `/book/${id}/full`, label: "Full book" },
] as const;

export function BookSubnav({ bookId }: Props) {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3 text-sm">
      {steps.map(({ href, label }) => {
        const h = href(bookId);
        const active = pathname === h;
        return (
          <Link
            key={label}
            href={h}
            className={cn(
              "rounded-md px-3 py-1.5",
              active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
