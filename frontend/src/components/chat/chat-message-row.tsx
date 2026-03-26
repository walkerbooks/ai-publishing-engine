import type { ChatMessage } from "@/lib/types/chat";
import { VideoCardRow } from "@/components/chat/video-card-row";
import { AssistantOutlineBlock } from "@/components/chat/assistant-outline-block";
import { AssistantPreviewBlock } from "@/components/chat/assistant-preview-block";

type Props = { message: ChatMessage };

export function ChatMessageRow({ message }: Props) {
  const isUser = message.role === "user";
  const kind = message.kind ?? "intake";

  return (
    <div className={`mb-3 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-xl bg-[#1e3a5f] px-4 py-3 text-sm leading-relaxed text-white shadow"
            : "max-w-[85%] py-2 text-sm leading-relaxed text-slate-800"
        }
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

        {message.role === "assistant" && (kind === "intake" || !message.kind) ? (
          <>
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
            {message.videos?.length ? (
              <VideoCardRow videos={message.videos} />
            ) : null}
          </>
        ) : null}

        {message.role === "assistant" && kind === "gate" ? (
          <div className="whitespace-pre-wrap break-words px-1">
            {message.content}
          </div>
        ) : null}

        {message.role === "user" ? (
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        ) : null}
      </div>
    </div>
  );
}
