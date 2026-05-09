import type { ChatMessage } from "@/lib/types/chat";
import {
  isGuestNameCaptureTurn,
  shouldShowGuestEmailCapture,
} from "@/lib/chat/welcome-flow";

export type CollaborativeFeedbackOpts = {
  intakeCollaborative: boolean;
  intakeComplete: boolean;
  busy: boolean;
  awaitingGate: null | "outline" | "preview" | "post_preview" | "full";
  composerStep: "intake" | "outline" | "preview";
  /** Kickoff inline flow must finish before collaborative feedback applies */
  bookKickoffStage:
    | "before_choice"
    | "choice"
    | "title"
    | "subtitle"
    | "summary"
    | "general_idea"
    | "done";
  isAuthenticated: boolean;
};

/**
 * After each streamed assistant intake reply in collaborative mode, show agree / change UI.
 * Skips guest name & email inline steps and kickoff placeholders.
 */
export function shouldShowCollaborativeFeedback(
  messages: ChatMessage[],
  opts: CollaborativeFeedbackOpts,
): boolean {
  if (!opts.intakeCollaborative || opts.intakeComplete) return false;
  if (opts.busy) return false;
  if (opts.awaitingGate !== null) return false;
  if (opts.composerStep !== "intake") return false;
  if (opts.bookKickoffStage !== "done") return false;

  const last = messages.at(-1);
  if (!last || last.role !== "assistant") return false;
  const kind = last.kind ?? "intake";
  if (kind !== "intake" && last.kind) return false;

  const lastIdx = messages.length - 1;
  if (!opts.isAuthenticated && isGuestNameCaptureTurn(messages, lastIdx)) {
    return false;
  }
  if (!opts.isAuthenticated && shouldShowGuestEmailCapture(messages)) {
    return false;
  }

  const content = last.content.trim();
  if (!content || content.startsWith("[")) return false;

  // Questions / multi-part asks need the dock — must run before pending-brief and before
  // offerCollaborativeFeedback === true (model sometimes sets that wrong while still asking).
  if (assistantIntakeMessageExpectsTypedReply(content)) return false;

  const hasPendingCollaborativeBrief =
    Boolean(
      last.bookSpec &&
        typeof last.bookSpec === "object" &&
        Object.keys(last.bookSpec as object).length > 0,
    ) &&
    !opts.intakeComplete;

  if (hasPendingCollaborativeBrief) return true;

  const ocf = last.offerCollaborativeFeedback;
  if (ocf === false) return false;
  if (ocf === true) return true;

  return true;
}

/**
 * User should use the dock (not Sounds good / change): discovery questions, multi-ask, etc.
 * Rhetorical check-ins ("Is that a good start?") are NOT typed-only — those show the two options.
 */
function assistantIntakeMessageExpectsTypedReply(content: string): boolean {
  const t = content.trim();
  if (!t) return false;

  const qMarks = (t.match(/\?|？/g) || []).length;
  if (qMarks >= 2) return true;

  if (!/[?？][\s"')\]]*$/u.test(t)) return false;

  const lastSentence = lastSentenceFromAssistantTurn(t);
  if (isCheckpointConfirmationQuestion(lastSentence)) return false;

  return true;
}

function lastSentenceFromAssistantTurn(t: string): string {
  const parts = t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? t;
}

/**
 * Final sentence is a yes/no or thumbs-up check-in (show collaborative buttons).
 * Discovery questions (what/which/how/…) stay typed-only.
 */
function isCheckpointConfirmationQuestion(lastSentence: string): boolean {
  const s = lastSentence
    .trim()
    .toLowerCase()
    .replace(/[?？]+[\s"')\]]*$/u, "")
    .trim();
  if (!s) return false;

  if (/^(what|which|who|whom|whose|where|when|why|how)\b/.test(s)) return false;
  if (/^and would you\b/.test(s)) return false;
  if (/^are you (thinking|hoping|looking)\b/.test(s)) return false;
  if (/^what do you think\b/.test(s)) return false;
  if (/^tell me\b/.test(s)) return false;
  if (/^for example\b/.test(s)) return false;

  return (
    /^is that (a good )?start\b/.test(s) ||
    /^is this (what you|right|ok|aligned)\b/.test(s) ||
    /^does (that|this) (look|sound) (good|right)\b/.test(s) ||
    /^does that work for you\b/.test(s) ||
    /^is that ok\b/.test(s) ||
    /^sound good\b/.test(s) ||
    /^make sense\b/.test(s) ||
    /^good so far\b/.test(s) ||
    /^ready to (move on|continue)\b/.test(s) ||
    /^shall we (continue|go)\b/.test(s) ||
    /^does that match\b/.test(s) ||
    /^is that (what you|close)\b/.test(s)
  );
}

export const COLLAB_CHANGE_QUICK_OPTIONS: { label: string; message: string }[] = [
  {
    label: "Tone",
    message:
      "I'd like to adjust the tone — let's tweak how the story feels overall.",
  },
  {
    label: "Setting / time",
    message: "I'd like to change the setting or the time period.",
  },
  {
    label: "Plot / conflict",
    message: "I'd like to revise the main plot or central conflict.",
  },
];
