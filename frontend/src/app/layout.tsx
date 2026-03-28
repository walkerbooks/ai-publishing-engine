import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppHeader } from "@/components/layout/app-header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Publishing Engine",
  description: "Create and publish ebooks with AI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <AppHeader />
            <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
