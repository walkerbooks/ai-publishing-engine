"use client";
import { useRouter } from "next/navigation";
import { useVideoInjection } from "@/hooks/use-video-injection";
import { useUnifiedChatSend } from "@/hooks/use-unified-chat-send";
import { usePublishingStore } from "@/stores/publishing-store";
import { ChatWelcome } from "@/components/chat/chat-welcome";
import { ChatThread } from "@/components/chat/chat-thread";
import { ChatComposer } from "@/components/chat/chat-composer";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatGatePanel } from "@/components/chat/chat-gate-panel";

export function ChatPageClient() {
  const router = useRouter();
  useVideoInjection();
  const { send, busy, err, clearErr } = useUnifiedChatSend();
  const messages = usePublishingStore((s) => s.chatMessages);
  const awaitingGate = usePublishingStore((s) => s.awaitingGate);

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
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold text-slate-900">
        Unified chat (intake → outline → preview)
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Alex streams the intake reply, then shows outline/preview steps as blocks in the same chat.
      </p>
      {err ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {err}
        </p>
      ) : null}
      {messages.length === 0 ? (
        <div className="mt-6">
          <ChatWelcome onPick={onWelcomePick} />
        </div>
      ) : (
        <>
          <div className="mt-6">
            <ChatThread messages={messages} />
            {busy ? (
              <div className="mt-2 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : null}
          </div>
          {awaitingGate ? (
            <ChatGatePanel
              awaitingGate={awaitingGate}
              onProceedToOutline={proceedToOutline}
              onChangeRequirements={changeRequirements}
              onProceedToPreview={proceedToPreview}
              onChangeOutline={changeOutline}
              onUnlockFull={unlockFull}
              onChangePreview={changePreview}
            />
          ) : (
            <ChatComposer
              disabled={busy}
              onSend={(t) => (clearErr(), void send(t))}
            />
          )}
        </>
      )}
    </div>
  );
}
