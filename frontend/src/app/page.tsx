import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-slate-900">AI Publishing Engine</h1>
      <p className="mt-4 text-slate-600">
        Chat through requirements, outline, preview, then full book — powered by your FastAPI
        AI service.
      </p>
      <Button asChild className="mt-8">
        <Link href="/chat">Start with chat</Link>
      </Button>
    </div>
  );
}
