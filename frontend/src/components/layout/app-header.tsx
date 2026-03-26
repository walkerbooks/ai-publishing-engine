import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-semibold text-slate-900">
          AI Publishing
        </Link>
        <nav className="flex gap-4 text-sm text-slate-600">
          <Link href="/chat" className="hover:text-slate-900">
            Chat
          </Link>
        </nav>
      </div>
    </header>
  );
}
