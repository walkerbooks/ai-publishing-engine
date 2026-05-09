"use client";

import { useEffect, useRef } from "react";
import {
  getBook,
  listChapters,
  patchBook,
  requestFullGeneration,
  type BackendChapter,
} from "@/lib/api/books-client";
import { getBookConversationLinkForApi } from "@/lib/api/sync-server-book";
import {
  exportFileUrl,
  exportPreviewUrl,
  getExportStatus,
  requestBookExport,
} from "@/lib/api/exports-client";
import { checkFullGenerationEntitlement } from "@/lib/api/subscriptions-client";
import { getAccessToken, getUserFirstName } from "@/lib/auth/access-token";
import { randomFullBookQuip } from "@/lib/chat/full-book-quips";
import type { FullBookGenPhase } from "@/lib/types/chat";
import { buildBookDescriptionJson } from "@/lib/book/book-description-payload";
import { getLogger } from "@/lib/log";
import { usePublishingStore } from "@/stores/publishing-store";

const log = getLogger("full-book-chat-flow");

const PAID_LIKE = new Set(["paid", "generating", "complete"]);

/** Go only enqueues full generation from these statuses via POST /full-book/request. */
const FULL_BOOK_POST_STATUSES = new Set(["preview_ready", "awaiting_payment"]);

/** Generation started or finished — avoid duplicate POST /full-book/request. */
const FULL_BOOK_JOB_UNDERWAY = new Set(["generating", "complete"]);

function chapterToMd(c: BackendChapter): string {
  const body = c.content.trim();
  if (body.startsWith("#")) return body;
  return `# ${c.title}\n\n${body}`;
}

function firstChapterMarkdown(chapters: BackendChapter[]): string | undefined {
  const sorted = [...chapters].sort((a, b) => a.chapter_number - b.chapter_number);
  return sorted[0] ? chapterToMd(sorted[0]) : undefined;
}

function allChaptersMarkdown(chapters: BackendChapter[]): string {
  return [...chapters]
    .sort((a, b) => a.chapter_number - b.chapter_number)
    .map(chapterToMd)
    .join("\n\n---\n\n");
}

function expectedChapterCount(outline: Record<string, unknown> | null): number | null {
  const raw = outline?.chapters;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.length;
}

export function useFullBookChatFlow() {
  const activeBookId = usePublishingStore((s) => s.activeBookId);
  const bookSpec = usePublishingStore((s) => s.bookSpec);
  const bookOutline = usePublishingStore((s) => s.bookOutline);
  const previewContent = usePublishingStore((s) => s.previewContent);
  const mockPaymentConfirmed = usePublishingStore((s) => s.mockPaymentConfirmed);
  const postPayCoverFlowActive = usePublishingStore((s) => s.postPayCoverFlowActive);
  const subscriptionFullGenUnlocked = usePublishingStore(
    (s) => s.subscriptionFullGenUnlocked,
  );
  const patchChatMessage = usePublishingStore((s) => s.patchChatMessage);
  const pushAssistantMessage = usePublishingStore((s) => s.pushAssistantMessage);
  const setAwaitingGate = usePublishingStore((s) => s.setAwaitingGate);
  const setFullBookContent = usePublishingStore((s) => s.setFullBookContent);

  const messageIdRef = useRef<string | null>(null);
  const payloadSyncedRef = useRef(false);
  const genRequestedRef = useRef(false);
  const exportRequestedRef = useRef(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    payloadSyncedRef.current = false;
    genRequestedRef.current = false;
    exportRequestedRef.current = false;
    messageIdRef.current = null;
  }, [activeBookId]);

  useEffect(() => {
    const token = getAccessToken();
    if (
      !activeBookId ||
      !token ||
      !bookSpec ||
      !bookOutline ||
      !previewContent?.trim()
    ) {
      return;
    }

    if (usePublishingStore.getState().postPayCoverFlowActive) {
      return;
    }

    const stopPoll = () => {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const findOrCreateMessageId = (): string => {
      const fromStore = usePublishingStore
        .getState()
        .chatMessages.find((m) => m.kind === "full");
      if (fromStore) {
        messageIdRef.current = fromStore.id;
        return fromStore.id;
      }
      const id = crypto.randomUUID();
      messageIdRef.current = id;
      pushAssistantMessage({
        id,
        role: "assistant",
        kind: "full",
        content: "Full manuscript",
        fullGenPhase: "queued",
        fullGenStatusText: randomFullBookQuip(),
      });
      return id;
    };

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      if (usePublishingStore.getState().postPayCoverFlowActive) {
        return;
      }

      let book;
      try {
        book = await getBook(activeBookId, token);
      } catch (e) {
        log.debug("getBook failed", { err: e instanceof Error ? e.message : String(e) });
        return;
      }

      const statusNorm = (book.Status || "").trim().toLowerCase();
      const paid =
        PAID_LIKE.has(statusNorm) ||
        mockPaymentConfirmed ||
        subscriptionFullGenUnlocked;
      if (!paid) {
        /* Avoid GET /books/{id} every 4s while still on preview (user hasn't paid / unlocked).
         * Keep polling only when a payment may flip the row to `paid` (webhook). */
        if (statusNorm !== "awaiting_payment") {
          stopPoll();
        }
        return;
      }

      setAwaitingGate(null);

      const msgId = messageIdRef.current ?? findOrCreateMessageId();

      const existing = usePublishingStore.getState().chatMessages.find((m) => m.id === msgId);
      /* Snapshot restore can show "PDF ready" while Go export row is still queued — re-verify. */
      if (existing?.fullGenPhase === "complete") {
        if (!existing.fullPdfUrl?.trim()) {
          stopPoll();
          return;
        }
        try {
          const ex = await getExportStatus(activeBookId, "pdf", token);
          const st = (ex?.status || "").toLowerCase();
          const url = ex ? exportFileUrl(ex) : undefined;
          const exportReady =
            Boolean(url) &&
            (st === "ready" ||
              st === "complete" ||
              st === "completed" ||
              st === "success");
          if (exportReady) {
            stopPoll();
            return;
          }
          patchChatMessage(msgId, {
            fullGenPhase: "finishing",
            fullPdfUrl: null,
            fullGenStatusText: "Typesetting your PDF…",
            fullGenError: null,
          });
          exportRequestedRef.current = true;
        } catch {
          /* Transient errors: leave UI as-is; next tick retries verification. */
        }
      }

      if (!payloadSyncedRef.current) {
        payloadSyncedRef.current = true;
        void patchBook(activeBookId, token, {
          description: buildBookDescriptionJson(),
          ...getBookConversationLinkForApi(),
        }).catch(() => {
          payloadSyncedRef.current = false;
        });
      }

      if (!genRequestedRef.current) {
        const canPostFullBook = FULL_BOOK_POST_STATUSES.has(statusNorm);
        const jobAlreadyTracked = FULL_BOOK_JOB_UNDERWAY.has(statusNorm);

        if (jobAlreadyTracked) {
          genRequestedRef.current = true;
        } else if (
          canPostFullBook ||
          mockPaymentConfirmed ||
          subscriptionFullGenUnlocked ||
          statusNorm === "paid"
        ) {
          const gate = await checkFullGenerationEntitlement(token);
          if (!gate.ok) {
            patchChatMessage(msgId, {
              fullGenError: gate.message,
              fullGenStatusText: "",
            });
            return;
          }
          patchChatMessage(msgId, { fullGenError: null });
          genRequestedRef.current = true;
          void requestFullGeneration(activeBookId, token).catch((e: unknown) => {
            genRequestedRef.current = false;
            const msg =
              e instanceof Error
                ? e.message
                : "Full book generation could not be started.";
            patchChatMessage(msgId, {
              fullGenError: msg,
              fullGenStatusText: "",
            });
          });
        } else {
          genRequestedRef.current = true;
        }
      }

      let chapters: BackendChapter[] = [];
      try {
        chapters = await listChapters(activeBookId, token);
      } catch {
        /* */
      }

      if (chapters.length) {
        setFullBookContent(allChaptersMarkdown(chapters));
      }

      const expected = expectedChapterCount(bookOutline);
      const firstMd = firstChapterMarkdown(chapters);
      const allWritten =
        statusNorm === "complete" ||
        (expected != null && chapters.length >= expected);

      let phase: FullBookGenPhase;
      if (!firstMd) {
        phase = "generating";
      } else if (!allWritten) {
        phase = "first_chapter";
      } else {
        phase = "finishing";
      }

      patchChatMessage(msgId, {
        fullGenPhase: phase,
        fullBookTitle: book.Title || null,
      });

      if (allWritten && !exportRequestedRef.current) {
        exportRequestedRef.current = true;
        try {
          const current = await getExportStatus(activeBookId, "pdf", token);
          const curUrl = current ? exportFileUrl(current) : undefined;
          const curSt = (current?.status || "").toLowerCase();
          const alreadyServed =
            Boolean(curUrl) &&
            ["ready", "complete", "completed", "success"].includes(curSt);
          const pipelinePending =
            curSt === "queued" || curSt === "processing";
          /* POST /exports/request resets the row to queued and clears file_url — never call when:
           * PDF is already done (alreadyServed), or a worker is already building it (queued/processing). */
          if (!alreadyServed && !pipelinePending) {
            await requestBookExport(activeBookId, "pdf", token);
          }
        } catch (e) {
          log.warning("export kickoff failed", e);
          exportRequestedRef.current = false;
        }
      }

      if (allWritten && exportRequestedRef.current) {
        try {
          const ex = await getExportStatus(activeBookId, "pdf", token);
          /* 404: row not visible yet — keep polling (same as queued/processing). */
          if (ex === null) {
            return;
          }
          const st = (ex.status || "").toLowerCase();
          const url = exportFileUrl(ex);
          /* Require explicit success status + file_url — do not infer from “not queued”. */
          const looksReady =
            Boolean(url) &&
            (st === "ready" ||
              st === "complete" ||
              st === "completed" ||
              st === "success");
          if (looksReady) {
            patchChatMessage(msgId, {
              fullGenPhase: "complete",
              fullPdfUrl: exportPreviewUrl(activeBookId, "pdf"),
              fullGenStatusText: "",
              fullBookTitle: book.Title || null,
              fullBookAuthorName: getUserFirstName()?.trim() || null,
              fullGenError: null,
            });
            stopPoll();
            return;
          }
          if (st === "failed") {
            patchChatMessage(msgId, {
              fullGenPhase: "complete",
              fullPdfUrl: null,
              fullGenError: ex.error || "PDF export failed.",
              fullBookTitle: book.Title || null,
            });
            stopPoll();
          }
        } catch (e) {
          log.debug("getExportStatus error", {
            err: e instanceof Error ? e.message : String(e),
          });
        }
      }
    };

    void tick();
    pollRef.current = window.setInterval(tick, 4000);

    return () => {
      cancelled = true;
      stopPoll();
    };
  }, [
    activeBookId,
    bookSpec,
    bookOutline,
    previewContent,
    mockPaymentConfirmed,
    postPayCoverFlowActive,
    subscriptionFullGenUnlocked,
    patchChatMessage,
    pushAssistantMessage,
    setAwaitingGate,
    setFullBookContent,
  ]);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (usePublishingStore.getState().postPayCoverFlowActive) return;
      const m = usePublishingStore
        .getState()
        .chatMessages.find((x) => x.kind === "full" && x.fullGenPhase !== "complete");
      if (!m) return;
      const patch = usePublishingStore.getState().patchChatMessage;
      if (m.fullGenPhase === "finishing") {
        patch(m.id, { fullGenStatusText: "Typesetting your PDF…" });
      } else {
        patch(m.id, { fullGenStatusText: randomFullBookQuip() });
      }
    }, 3200);
    return () => window.clearInterval(t);
  }, []);
}
