import type { ChatMessage } from "@/lib/types/chat";
import { VideoCardRow } from "@/components/chat/video-card-row";
import { AssistantOutlineBlock } from "@/components/chat/assistant-outline-block";
import { AssistantPreviewBlock } from "@/components/chat/assistant-preview-block";
import { cn } from "@/lib/utils/cn";

type Props = {
  message: ChatMessage;
  variant?: "light" | "dark";
};

export function ChatMessageRow({ message, variant = "light" }: Props) {
  const isUser = message.role === "user";
  const kind = message.kind ?? "intake";
  const dark = variant === "dark";

  const assistantBubble =
    dark
      ? "rounded-2xl border border-white/10 bg-zinc-800/95 px-4 py-3 text-zinc-200 shadow-sm"
      : "rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-800 shadow-sm";

  return (
    <div className={`mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={cn(
          "max-w-[min(100%,36rem)] text-sm leading-relaxed",
          isUser &&
            (dark
              ? "rounded-2xl bg-zinc-700 px-4 py-3 text-white shadow-md"
              : "rounded-xl bg-[#1e3a5f] px-4 py-3 text-white shadow"),
          !isUser && assistantBubble,
        )}
      >
        {message.role === "assistant" && kind === "outline" ? (
          message.outline ? (
            <AssistantOutlineBlock outline={message.outline} />
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )
        ) : null}

        {message.role === "assistant" && kind === "preview" ? (
          message.previewMarkdown ? (
            <AssistantPreviewBlock markdown={message.previewMarkdown} />
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )
        ) : null}

        {message.role === "assistant" &&
        (kind === "intake" || !message.kind) ? (
          <>
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
            {message.videos?.length ? (
              <VideoCardRow videos={message.videos} dark={dark} />
            ) : null}
          </>
        ) : null}

        {message.role === "assistant" && kind === "gate" ? (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        ) : null}

        {message.role === "user" ? (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        ) : null}
      </div>
    </div>
  );
}
