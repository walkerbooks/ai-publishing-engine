"use client";

import { useState, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  disabled?: boolean;
  onSend: (text: string) => void;
};

export function ChatComposer({ disabled, onSend }: Props) {
  const [v, setV] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.trim() || disabled) return;
    onSend(v);
    setV("");
  };
  return (
    <form onSubmit={submit} className="mt-4 flex gap-2">
      <Input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Tell me about the book you want to create..."
        disabled={disabled}
        className="flex-1"
      />
      <Button type="submit" disabled={disabled || !v.trim()}>
        Send
      </Button>
    </form>
  );
}
