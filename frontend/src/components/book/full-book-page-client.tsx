"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = { bookId: string };

/** Full-book UX lives in /chat (assistant bubble + PDF). Old links redirect here. */
export function FullBookPageClient({ bookId: _bookId }: Props) {
  const router = useRouter();

  useEffect(() => {
    router.replace("/chat");
  }, [router]);

  return (
    <p className="px-4 py-8 text-center text-sm text-muted-foreground">Opening chat…</p>
  );
}
