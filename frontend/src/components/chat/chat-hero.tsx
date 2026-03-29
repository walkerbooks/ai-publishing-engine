"use client";

import { useEffect, useState } from "react";
import { ChatPillComposer } from "@/components/chat/chat-pill-composer";
import { authGreetingLabelForUi } from "@/lib/auth/greeting-name";
import {
  GENERIC_CHAT_GREETINGS,
  PERSONALIZED_CHAT_GREETINGS,
} from "@/lib/constants/chat-greetings";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";

/** Same on server and first client paint — avoids hydration mismatch (no Math.random during render). */
const CHAT_HERO_HEADLINE_SSR_DEFAULT = GENERIC_CHAT_GREETINGS[0];

function pickRandomHeadline(label: string | null): string {
  const pool = label
    ? PERSONALIZED_CHAT_GREETINGS.map((t) => t.replaceAll("{name}", label))
    : [...GENERIC_CHAT_GREETINGS];
  const i = Math.floor(Math.random() * pool.length);
  return pool[i] ?? pool[0];
}

type Props = {
  disabled?: boolean;
  onSend: (text: string) => void;
  className?: string;
};

export function ChatHero({ disabled, onSend, className }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const firstName = useAuthStore((s) => s.firstName);
  const email = useAuthStore((s) => s.email);
  const label = authGreetingLabelForUi(isAuthenticated, firstName, email);

  const [headline, setHeadline] = useState<string>(CHAT_HERO_HEADLINE_SSR_DEFAULT);

  useEffect(() => {
    setHeadline(pickRandomHeadline(label));
  }, [label]);

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-8 text-center",
        className,
      )}
    >
      <div className="space-y-2 px-2">
        <h1 className="text-balance text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          {headline}
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Describe the book you want to create — genre, audience, and tone — and
          we&apos;ll go from there.
        </p>
      </div>

      <ChatPillComposer
        disabled={disabled}
        onSend={onSend}
        placeholder="Ask anything"
        autoFocus
        className="mx-auto"
      />
    </div>
  );
}
