import { ChatViewportLock } from "./chat-viewport-lock";

export default function ChatLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ChatViewportLock>
      {/* Fill <main> via flex-1 + min-h-0 (no calc — avoids header height mismatch) */}
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden overscroll-none bg-[#0d0d0d] text-zinc-100">
        {children}
      </div>
    </ChatViewportLock>
  );
}
