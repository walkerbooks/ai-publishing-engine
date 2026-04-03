import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppHeader } from "@/components/layout/app-header";
import { cn } from "@/lib/utils/cn";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Walkerbook",
  description:
    "Where stories begin their journey — chat through your book idea, shape an outline, preview your voice, and grow a full manuscript with AI-assisted publishing.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(inter.className, "min-h-dvh bg-background text-foreground")}
        suppressHydrationWarning
      >
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <AppHeader />
            <div
              className="h-0.5 w-full shrink-0 bg-gradient-to-r from-walker-charcoal via-walker-navy to-walker-teal"
              aria-hidden
            />
            <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
