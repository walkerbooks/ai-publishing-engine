"use client";
import { useRouter } from "next/navigation";
import { useVideoInjection } from "@/hooks/use-video-injection";
import { useUnifiedChatSend } from "@/hooks/use-unified-chat-send";
import { usePublishingStore } from "@/stores/publishing-store";
import { useChatDirectoryStore } from "@/stores/chat-directory-store";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { ChatShell } from "@/components/chat/shell/chat-shell";

export function ChatPageClient() {
  const router = useRouter();
  useVideoInjection();
  const { send, busy, err, clearErr } = useUnifiedChatSend();
  const messages = usePublishingStore((s) => s.chatMessages);
  const awaitingGate = usePublishingStore((s) => s.awaitingGate);
  const bookOutline = usePublishingStore((s) => s.bookOutline);
  const conversationCount = useChatDirectoryStore((s) => s.conversations.length);

  const hasThread = messages.length > 0;
  const showConversationChrome = hasThread || conversationCount > 0;

  const onWelcomePick = (opt: string) =>
    (clearErr(),
    usePublishingStore.getState().pushUserMessage(opt),
    usePublishingStore.getState().setPendingPrompt(opt),
    void send(null));

  const proceedToOutline = () =>
    (usePublishingStore.getState().setAwaitingGate(null),
    usePublishingStore.getState().setComposerStep("outline"),
    usePublishingStore.getState().setComposerAction("proceed"),
    void send("Proceed"));
  const changeRequirements = () =>
    (usePublishingStore.getState().setAwaitingGate(null),
    usePublishingStore.getState().setComposerStep("intake"),
    usePublishingStore.getState().setComposerAction("proceed"));
  const proceedToPreview = () =>
    (usePublishingStore.getState().setAwaitingGate(null),
    usePublishingStore.getState().setComposerStep("preview"),
    usePublishingStore.getState().setComposerAction("proceed"),
    void send("Proceed"));
  const changeOutline = () =>
    (usePublishingStore.getState().setAwaitingGate(null),
    usePublishingStore.getState().setComposerStep("outline"),
    usePublishingStore.getState().setComposerAction("revise"));
  const unlockFull = () =>
    (usePublishingStore.getState().setMockPayment(true),
    usePublishingStore.getState().activeBookId
      ? router.push(`/book/${usePublishingStore.getState().activeBookId}/full`)
      : null);
  const changePreview = () =>
    (usePublishingStore.getState().setAwaitingGate(null),
    usePublishingStore.getState().setComposerStep("preview"),
    usePublishingStore.getState().setComposerAction("revise"));

  return (
    <ChatShell showConversationChrome={showConversationChrome}>
      <ChatWorkspace
        hasThread={hasThread}
        err={err}
        busy={busy}
        messages={messages}
        bookOutline={bookOutline}
        awaitingGate={awaitingGate}
        onWelcomePick={onWelcomePick}
        onSend={(t) => void send(t)}
        clearErr={clearErr}
        proceedToOutline={proceedToOutline}
        changeRequirements={changeRequirements}
        proceedToPreview={proceedToPreview}
        changeOutline={changeOutline}
        unlockFull={unlockFull}
        changePreview={changePreview}
      />
    </ChatShell>
  );
}
