import type { ChatMessage } from "@/lib/types/chat";
import { VideoCardRow } from "@/components/chat/video-card-row";
import { AssistantOutlineBlock } from "@/components/chat/assistant-outline-block";
import { AssistantPreviewBlock } from "@/components/chat/assistant-preview-block";
import { AssistantFullBookBlock } from "@/components/chat/assistant-full-book-block";
import { cn } from "@/lib/utils/cn";

type Props = {
  message: ChatMessage;
  variant?: "light" | "dark";
  className?: string;
  /** Shown after the YouTube row (guest email step) — keeps copy inside the same bubble. */
  afterVideosBridgeText?: string;
};

export function ChatMessageRow({
  message,
  variant = "light",
  className,
  afterVideosBridgeText,
}: Props) {
  const isUser = message.role === "user";
  const kind = message.kind ?? "intake";
  const dark = variant === "dark";

  const assistantBubble =
    dark
      ? "rounded-2xl border border-walker-navy/35 bg-walker-nightPanel px-4 py-3 text-zinc-200 shadow-sm"
      : "rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-800 shadow-sm";

  return (
    <div
      className={cn(
        "mb-4 flex",
        isUser ? "justify-end" : "justify-start",
        className,
      )}
    >
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
            <AssistantOutlineBlock outline={message.outline} chrome="embedded" />
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )
        ) : null}

        {message.role === "assistant" && kind === "preview" ? (
          message.previewMarkdown ? (
            <AssistantPreviewBlock markdown={message.previewMarkdown} chrome="embedded" />
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )
        ) : null}

        {message.role === "assistant" && kind === "full" ? (
          <AssistantFullBookBlock
            phase={message.fullGenPhase ?? "generating"}
            statusLine={message.fullGenStatusText ?? "…"}
            firstChapterMarkdown={message.fullChapterMarkdown}
            bookTitle={message.fullBookTitle}
            authorName={message.fullBookAuthorName}
            pdfUrl={message.fullPdfUrl}
            error={message.fullGenError}
            chrome="embedded"
          />
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
            {afterVideosBridgeText ? (
              <p
                className={cn(
                  "mt-4 text-sm leading-relaxed",
                  dark ? "text-zinc-300" : "text-slate-600",
                )}
              >
                {afterVideosBridgeText}
              </p>
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
