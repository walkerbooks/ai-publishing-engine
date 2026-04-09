"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { AuthHydrate } from "@/components/auth/auth-hydrate";
import { SubscriptionInactiveBanner } from "@/components/subscription/subscription-inactive-banner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 2 },
          mutations: { retry: 1 },
        },
      }),
  );
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <AuthHydrate />
        <SubscriptionInactiveBanner />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
