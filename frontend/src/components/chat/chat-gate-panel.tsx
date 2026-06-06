"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { UserErrorBanner } from "@/components/ui/user-error-banner";
import { cn } from "@/lib/utils/cn";
import type { MappedUserError } from "@/lib/errors/user-error-message";
import { usePublishingStore } from "@/stores/publishing-store";

/** Shared checkboxes + text areas; values persist in the publishing store for PATCH to Go. */
function FullBookFrontMatterCheckboxes() {
  const fullBookIncludeAboutAuthor = usePublishingStore((s) => s.fullBookIncludeAboutAuthor);
  const fullBookIncludeAcknowledgement = usePublishingStore(
    (s) => s.fullBookIncludeAcknowledgement,
  );
  const fullBookAboutAuthorText = usePublishingStore((s) => s.fullBookAboutAuthorText);
  const fullBookAcknowledgementText = usePublishingStore(
    (s) => s.fullBookAcknowledgementText,
  );
  const setFullBookIncludeAboutAuthor = usePublishingStore(
    (s) => s.setFullBookIncludeAboutAuthor,
  );
  const setFullBookIncludeAcknowledgement = usePublishingStore(
    (s) => s.setFullBookIncludeAcknowledgement,
  );
  const setFullBookAboutAuthorText = usePublishingStore((s) => s.setFullBookAboutAuthorText);
  const setFullBookAcknowledgementText = usePublishingStore(
    (s) => s.setFullBookAcknowledgementText,
  );

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
      <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-800 dark:text-zinc-100">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-walker-teal focus:ring-walker-teal"
          checked={fullBookIncludeAboutAuthor}
          onChange={(e) => setFullBookIncludeAboutAuthor(e.target.checked)}
        />
        <span>Include about the author</span>
      </label>
      {fullBookIncludeAboutAuthor ? (
        <textarea
          value={fullBookAboutAuthorText}
          onChange={(e) => setFullBookAboutAuthorText(e.target.value)}
          placeholder="Your author bio…"
          rows={4}
          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-walker-teal focus:outline-none focus:ring-1 focus:ring-walker-teal dark:border-white/15 dark:bg-walker-nightPanel dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      ) : null}
      <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-800 dark:text-zinc-100">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-walker-teal focus:ring-walker-teal"
          checked={fullBookIncludeAcknowledgement}
          onChange={(e) => setFullBookIncludeAcknowledgement(e.target.checked)}
        />
        <span>Include acknowledgements</span>
      </label>
      {fullBookIncludeAcknowledgement ? (
        <textarea
          value={fullBookAcknowledgementText}
          onChange={(e) => setFullBookAcknowledgementText(e.target.value)}
          placeholder="Your acknowledgements…"
          rows={4}
          className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-walker-teal focus:outline-none focus:ring-1 focus:ring-walker-teal dark:border-white/15 dark:bg-walker-nightPanel dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      ) : null}
    </div>
  );
}

const SWIPE_COMMIT_PX = 56;

function CoverVariantMobileStack({
  coverVariantUrls,
  onPickCoverVariant,
}: {
  coverVariantUrls: string[];
  onPickCoverVariant: (index: number) => void;
}) {
  const n = coverVariantUrls.length;
  const [active, setActive] = useState(0);
  const [dragX, setDragX] = useState(0);
  const startRef = useRef<{ x: number } | null>(null);

  useEffect(() => {
    setActive(0);
  }, [coverVariantUrls]);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX };
    setDragX(0);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return;
    setDragX(e.clientX - startRef.current.x);
  }, []);

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!startRef.current) return;
      const dx = e.clientX - startRef.current.x;
      startRef.current = null;
      setDragX(0);
      /* Only a deliberate horizontal swipe changes the card; anything else confirms the
       * front cover. A dead zone (small movement but below SWIPE_COMMIT_PX) used to do
       * nothing on touch devices, so the cover never reached Go and PDFs shipped without art. */
      if (dx <= -SWIPE_COMMIT_PX) {
        setActive((a) => (a + 1) % n);
      } else if (dx >= SWIPE_COMMIT_PX) {
        setActive((a) => (a + n - 1) % n);
      } else {
        onPickCoverVariant(active);
      }
    },
    [active, n, onPickCoverVariant],
  );

  const onPointerCancel = useCallback(() => {
    startRef.current = null;
    setDragX(0);
  }, []);

  return (
    <div className="space-y-3">
      <div
        className="relative mx-auto w-full max-w-[min(100%,280px)] touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        role="group"
        aria-label="Cover options — swipe left or right to compare, tap to choose"
      >
        <div className="relative aspect-[2/3] w-full">
          {coverVariantUrls.map((url, i) => {
            const stackPos = (i - active + n) % n;
            const isFront = stackPos === 0;
            const offsetY = stackPos === 0 ? 0 : stackPos === 1 ? 10 : 20;
            const scale = stackPos === 0 ? 1 : stackPos === 1 ? 0.94 : 0.88;
            const z = 30 - stackPos * 10;
            const tx = isFront ? dragX : 0;
            return (
              <div
                key={i}
                className={cn(
                  "absolute inset-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md dark:border-white/15 dark:bg-walker-nightPanel dark:shadow-lg",
                  dragX === 0 && "transition-[transform,opacity] duration-300 ease-out",
                  !isFront && "pointer-events-none",
                )}
                style={{
                  zIndex: z,
                  transform: `translateX(${tx}px) translateY(${offsetY}px) scale(${scale})`,
                  opacity: stackPos === 2 ? 0.92 : 1,
                }}
              >
                <Image
                  src={url}
                  alt={`Cover option ${i + 1} of ${n}`}
                  width={512}
                  height={768}
                  unoptimized
                  draggable={false}
                  className="pointer-events-none h-full w-full object-cover"
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-center text-xs font-medium text-slate-600 dark:text-zinc-300">
          Option {active + 1} of {n} · swipe to compare, then tap the cover or use the button below
        </p>
        <Button
          type="button"
          className="w-full max-w-[min(100%,280px)] bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          onClick={() => onPickCoverVariant(active)}
        >
          Use this cover
        </Button>
        <div className="flex justify-center gap-2" role="tablist" aria-label="Jump to cover option">
          {coverVariantUrls.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show option ${i + 1}`}
              onClick={(ev) => {
                ev.stopPropagation();
                setActive(i);
              }}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-colors",
                i === active
                  ? "bg-slate-800 dark:bg-zinc-100"
                  : "bg-slate-300 hover:bg-slate-400 dark:bg-white/25 dark:hover:bg-white/40",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

type FullGateMode = "loading" | "generate" | "cooldown" | "paypal";

type Props = {
  awaitingGate: null | "outline" | "preview" | "post_preview" | "full";
  onProceedToOutline: () => void;
  onChangeRequirements: () => void;
  onProceedToPreview: () => void;
  onChangeOutline: () => void;
  /** After preview: optional paid cover generation ($1 when checkout is enabled). */
  onPayForCoverPage: () => void;
  /** After preview: move to full-book payment / subscription gate. */
  onContinueToFullBookFromPostPreview: () => void;
  coverGenBusy?: boolean;
  /** When set (length 3), user picks one cover before continuing. */
  coverVariantUrls?: string[] | null;
  onPickCoverVariant?: (index: number) => void;
  /** Opens PayPal / pricing when user must pay. */
  onPayForFullBook: () => void;
  /** Uses subscription credits; skips pricing when entitlement allows. */
  onGenerateFullWithSubscription: () => void;
  onChangePreview: () => void;
  /** When gate is `full`, how to label the primary action (from GET /subscriptions/entitlement). */
  fullBookGateMode?: FullGateMode;
  payPalLoading?: boolean;
  generateFullBusy?: boolean;
  payPalError?: MappedUserError | null;
  onRetryPayment?: () => void;
  onDismissPayment?: () => void;
  /** Post-preview: waiting for user to type cover signing name in composer below. */
  awaitingCoverSigningReply?: boolean;
};

export function ChatGatePanel({
  awaitingGate,
  onProceedToOutline,
  onChangeRequirements,
  onProceedToPreview,
  onChangeOutline,
  onPayForCoverPage,
  onContinueToFullBookFromPostPreview,
  coverGenBusy = false,
  coverVariantUrls = null,
  onPickCoverVariant,
  onPayForFullBook,
  onGenerateFullWithSubscription,
  onChangePreview,
  fullBookGateMode = "paypal",
  payPalLoading,
  generateFullBusy = false,
  payPalError,
  onRetryPayment,
  onDismissPayment,
  awaitingCoverSigningReply = false,
}: Props) {
  const postPayCoverFlowActive = usePublishingStore((s) => s.postPayCoverFlowActive);
  const postPayFrontMatterLocked = usePublishingStore((s) => s.postPayFrontMatterLocked);

  if (!awaitingGate) return null;

  const btnPrimary =
    "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-400 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 dark:focus-visible:ring-zinc-400";
  const btnGhost =
    "border border-slate-300 bg-transparent text-slate-800 hover:bg-slate-100 focus-visible:ring-slate-400 dark:border-white/20 dark:text-zinc-100 dark:hover:bg-white/10 dark:focus-visible:ring-zinc-500";

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-walker-night">
      {awaitingGate === "outline" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            onClick={onProceedToOutline}
            className={cn(btnPrimary)}
          >
            Proceed to outline
          </Button>
          <Button
            variant="outline"
            onClick={onChangeRequirements}
            className={cn(btnGhost)}
          >
            Change requirements
          </Button>
        </div>
      ) : null}

      {awaitingGate === "preview" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button onClick={onProceedToPreview} className={cn(btnPrimary)}>
            Proceed to preview
          </Button>
          <Button
            variant="outline"
            onClick={onChangeOutline}
            className={cn(btnGhost)}
          >
            Change outline
          </Button>
        </div>
      ) : null}

      {awaitingGate === "post_preview" ? (
        <div className="space-y-4">
          {!postPayCoverFlowActive && !coverVariantUrls?.length ? (
            <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
              Your preview is ready. Choose a package for one PayPal payment. You can add an AI
              cover (three options, +$1) in the same checkout before you pay.
            </p>
          ) : null}

          {postPayCoverFlowActive && !postPayFrontMatterLocked ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
                First, add your{' '}
                <span className="font-medium text-slate-800 dark:text-zinc-100">About the author</span>
                {' '}and{' '}
                <span className="font-medium text-slate-800 dark:text-zinc-100">Acknowledgements</span>
                {' '}
                for the full manuscript if you want them included. (In the book, acknowledgements are
                typeset before about the author.) When you continue, this step closes and you will set
                up your cover (signing name, then layouts).
              </p>
              <FullBookFrontMatterCheckboxes />
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  className={cn(btnPrimary)}
                  onClick={() => {
                    const p = usePublishingStore.getState();
                    p.setPostPayFrontMatterLocked(true);
                  }}
                >
                  Continue to book cover
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={onChangePreview}
                  className={cn(btnGhost)}
                >
                  Change preview
                </Button>
              </div>
            </div>
          ) : null}

          {postPayCoverFlowActive && postPayFrontMatterLocked ? (
            <>
              {coverVariantUrls?.length === 3 ? (
                <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
                  Pick your favorite cover.
                </p>
              ) : (
                <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
                  When you are ready, tap{' '}
                  <span className="font-medium text-slate-800 dark:text-zinc-100">
                    Generate 3 cover options
                  </span>
                  . If needed we will ask how to sign the cover in the message box below, then you
                  choose a layout. After that you will unlock full manuscript generation.
                </p>
              )}
            </>
          ) : null}

          {awaitingCoverSigningReply &&
          (!postPayCoverFlowActive || postPayFrontMatterLocked) ? (
            <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
              Use the text box below to enter how you want to sign your book, then press Send.
            </p>
          ) : null}
          {coverVariantUrls?.length === 3 &&
          (!postPayCoverFlowActive || postPayFrontMatterLocked) ? (
            <>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
                <span className="sm:hidden">
                  Here are three cover directions. Swipe left or right on the stack to compare, then
                  tap the front cover or tap <span className="font-medium">Use this cover</span> to
                  add it to the chat. You can then unlock the full book.
                </span>
                <span className="hidden sm:inline">
                  Here are three cover directions. Tap your favorite — it will appear in the chat
                  above, then you can unlock the full book.
                </span>
              </p>
              <div className="sm:hidden">
                <CoverVariantMobileStack
                  coverVariantUrls={coverVariantUrls}
                  onPickCoverVariant={(i) => onPickCoverVariant?.(i)}
                />
              </div>
              <div
                className="hidden grid-cols-3 gap-3 sm:grid"
                role="group"
                aria-label="Cover options"
              >
                {coverVariantUrls.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onPickCoverVariant?.(i)}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-white/15 dark:bg-walker-nightPanel dark:hover:border-white/30 dark:focus-visible:ring-zinc-500",
                    )}
                  >
                    <Image
                      src={url}
                      alt={`Cover option ${i + 1} of 3`}
                      width={512}
                      height={768}
                      unoptimized
                      className="aspect-[2/3] w-full object-cover"
                    />
                    <span className="px-2 py-2 text-center text-xs font-medium text-slate-700 dark:text-zinc-200">
                      Option {i + 1}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  onClick={onPayForCoverPage}
                  className={cn(btnGhost)}
                  disabled={coverGenBusy}
                >
                  {coverGenBusy ? "Regenerating…" : "Generate 3 new options"}
                </Button>
                {!postPayCoverFlowActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onContinueToFullBookFromPostPreview}
                    className={cn(btnGhost)}
                    disabled={coverGenBusy}
                  >
                    Skip cover · continue to full book
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onContinueToFullBookFromPostPreview}
                    className={cn(btnGhost)}
                    disabled={coverGenBusy}
                  >
                    Continue to full book without cover image
                  </Button>
                )}
                <Button
                  variant="outline"
                  type="button"
                  onClick={onChangePreview}
                  className={cn(btnGhost)}
                  disabled={coverGenBusy}
                >
                  Change preview
                </Button>
              </div>
            </>
          ) : !(postPayCoverFlowActive && !postPayFrontMatterLocked) ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {postPayCoverFlowActive ? (
                <Button
                  type="button"
                  onClick={onPayForCoverPage}
                  className={cn(btnPrimary)}
                  disabled={
                    coverGenBusy ||
                    awaitingCoverSigningReply ||
                    !postPayFrontMatterLocked
                  }
                >
                  {coverGenBusy
                    ? "Generating 3 covers…"
                    : "Generate 3 cover options (included in your purchase)"}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={onPayForFullBook}
                  className={cn(btnPrimary)}
                  disabled={payPalLoading || coverGenBusy}
                >
                  {payPalLoading ? "Opening PayPal…" : "Choose package & pay"}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={onContinueToFullBookFromPostPreview}
                className={cn(btnGhost)}
                disabled={
                  coverGenBusy ||
                  payPalLoading ||
                  (postPayCoverFlowActive && !postPayFrontMatterLocked)
                }
              >
                {postPayCoverFlowActive
                  ? "Skip cover · start full book"
                  : "Continue to full book"}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={onChangePreview}
                className={cn(btnGhost)}
                disabled={coverGenBusy || payPalLoading}
              >
                Change preview
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {awaitingGate === "full" ? (
        <div className="space-y-4">
          {postPayFrontMatterLocked ? (
            <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
              Your about the author and acknowledgements are saved for this book. Next, confirm
              payment or start generation below. Use <span className="font-medium">Change preview</span>{" "}
              only if you need to go back and edit earlier steps.
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
                Before we generate your full manuscript: would you like an{' '}
                <span className="font-medium text-slate-800 dark:text-zinc-100">About the author</span>{' '}
                section and/or{' '}
                <span className="font-medium text-slate-800 dark:text-zinc-100">Acknowledgements</span>
                ? Check the boxes you want, then add your text below each. (In the book,
                acknowledgements are typeset before about the author.)
              </p>
              <FullBookFrontMatterCheckboxes />
            </>
          )}
          {payPalError ? (
            <UserErrorBanner
              layout="polite"
              className="mb-3 w-full"
              message={payPalError.message}
              tone={payPalError.tone}
              retryable={payPalError.retryable}
              onRetry={onRetryPayment}
              onDismiss={onDismissPayment}
              dismissLabel="Not now"
            />
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {fullBookGateMode === "loading" ? (
            <Button className={cn(btnPrimary)} disabled>
              Checking your plan…
            </Button>
          ) : fullBookGateMode === "generate" ? (
            <Button
              onClick={onGenerateFullWithSubscription}
              className={cn(btnPrimary)}
              disabled={generateFullBusy}
            >
              {generateFullBusy ? "Starting…" : "Generate full book"}
            </Button>
          ) : fullBookGateMode === "cooldown" ? (
            <>
              <Button
                type="button"
                onClick={onGenerateFullWithSubscription}
                className={cn(btnPrimary)}
                disabled={generateFullBusy}
              >
                {generateFullBusy ? "Starting…" : "Generate full book"}
              </Button>
              <Button
                variant="outline"
                onClick={onPayForFullBook}
                className={cn(btnGhost)}
                disabled={payPalLoading || generateFullBusy}
              >
                {payPalLoading ? "Opening PayPal…" : "Buy more books"}
              </Button>
            </>
          ) : (
            <Button
              onClick={onPayForFullBook}
              className={cn(btnPrimary)}
              disabled={payPalLoading}
            >
              {payPalLoading ? "Opening PayPal…" : "Pay with PayPal (full book)"}
            </Button>
          )}
          {fullBookGateMode === "generate" ? (
            <Button
              variant="outline"
              onClick={onPayForFullBook}
              className={cn(btnGhost)}
              disabled={payPalLoading || generateFullBusy}
            >
              {payPalLoading ? "Opening PayPal…" : "Buy another plan instead"}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={onChangePreview}
            className={cn(btnGhost)}
          >
            Change preview
          </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
