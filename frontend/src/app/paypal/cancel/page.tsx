"use client";

import Link from "next/link";
import { useEffect } from "react";
import { getLogger } from "@/lib/log";
import { PAYPAL_BOOK_STORAGE_KEY } from "@/lib/paypal/checkout-session";

const log = getLogger("paypal-cancel");
import { PayPalFlowCard } from "@/components/paypal/paypal-flow-card";
import { Button } from "@/components/ui/button";

export default function PayPalCancelPage() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(PAYPAL_BOOK_STORAGE_KEY);
      log.debug("cleared checkout book id from sessionStorage");
    } catch {
      /* */
    }
  }, []);

  return (
    <PayPalFlowCard title="Payment canceled">
      <p className="min-w-0 text-sm leading-relaxed break-words text-muted-foreground sm:text-base">
        Your PayPal checkout was canceled. No charge was made. You can return to your book and try
        again when you are ready.
      </p>
      <div className="flex min-w-0 flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button asChild className="h-11 w-full min-w-0 sm:h-9 sm:w-auto">
          <Link href="/chat">Back to chat</Link>
        </Button>
        <Button variant="outline" asChild className="h-11 w-full min-w-0 sm:h-9 sm:w-auto">
          <Link href="/pricing">View packages</Link>
        </Button>
        <Button variant="ghost" asChild className="h-11 w-full min-w-0 sm:h-9 sm:w-auto">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </PayPalFlowCard>
  );
}
