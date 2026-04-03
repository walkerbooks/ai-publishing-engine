"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getBook } from "@/lib/api/books-client";
import { getAccessToken } from "@/lib/auth/access-token";
import { PAYPAL_BOOK_STORAGE_KEY } from "@/lib/paypal/checkout-session";
import { PayPalFlowCard } from "@/components/paypal/paypal-flow-card";
import { Button } from "@/components/ui/button";
import { getLogger } from "@/lib/log";
import { cn } from "@/lib/utils/cn";

const log = getLogger("paypal-return");

const PAID_LIKE = new Set(["paid", "generating", "complete"]);

export function PayPalReturnClient() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming payment…");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const token = getAccessToken();
    let bookId: string | null = null;
    try {
      bookId = sessionStorage.getItem(PAYPAL_BOOK_STORAGE_KEY);
    } catch {
      /* */
    }
    if (!bookId) {
      log.warning("no book id in sessionStorage after PayPal return");
      setMessage("No book context. Open your book from the app and try again.");
      return;
    }
    if (!token) {
      log.warning("no access token on PayPal return page");
      setMessage("Sign in to refresh your book status after PayPal.");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20;

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const book = await getBook(bookId!, token);
        if (PAID_LIKE.has(book.Status)) {
          try {
            sessionStorage.removeItem(PAYPAL_BOOK_STORAGE_KEY);
          } catch {
            /* */
          }
          log.debug("book paid-like; redirecting to full book", {
            bookId,
            status: book.Status,
          });
          router.replace(`/chat?book=${encodeURIComponent(bookId!)}`);
          return;
        }
      } catch {
        /* webhook may lag; retry */
      }
      if (attempts >= maxAttempts) {
        log.warning("poll max attempts reached; status may still be updating", {
          bookId,
          attempts: maxAttempts,
        });
        setMessage(
          "Payment can take a moment. Open your book page to see the latest status.",
        );
        return;
      }
      window.setTimeout(tick, 1500);
    };

    void tick();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const showSignInLink = mounted && !getAccessToken();
  const confirming = message === "Confirming payment…";
  const isError =
    message.startsWith("No book context") ||
    message.startsWith("Sign in to refresh");

  return (
    <PayPalFlowCard title="Payment status">
      <div className="flex min-w-0 items-start gap-3">
        {confirming ? (
          <Loader2
            className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : null}
        <p
          role={isError ? "alert" : undefined}
          className={cn(
            "min-w-0 flex-1 text-sm leading-relaxed break-words sm:text-base",
            isError ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
          )}
        >
          {message}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
        {showSignInLink ? (
          <Button asChild className="h-11 w-full min-w-0 sm:h-9 sm:w-auto">
            <Link href={`/login?next=${encodeURIComponent("/paypal/return")}`}>Sign in</Link>
          </Button>
        ) : null}
        <Button variant="outline" asChild className="h-11 w-full min-w-0 sm:h-9 sm:w-auto">
          <Link href="/chat">Back to chat</Link>
        </Button>
      </div>
    </PayPalFlowCard>
  );
}
