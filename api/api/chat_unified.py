"""Unified chat streaming: intake (streamed) → outline → preview.

Frontend renders each stage as a separate assistant block inside one chat window.
"""

from __future__ import annotations

import json
import uuid
from typing import Any, Iterator, Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from api.agents.intake_agent import run_intake
from api.services.bso_validator import validate_bso
from api.agents.outline_agent import (
    merge_target_pages_from_revision_into_spec,
    run_outline,
)
from api.agents.preview_agent import run_preview
from api.config import get_settings

router = APIRouter(prefix="/api", tags=["chat-unified"])


class UnifiedChatStepRequest(BaseModel):
    message: str = Field(default="", description="User message or revision instructions")
    session_id: str | None = None
    history: list[dict[str, str]] = Field(default_factory=list)

    # Which agent to run next
    step: Literal["intake", "outline", "preview", "full"] = "intake"
    # If the user wants to change the current stage output
    action: Literal["proceed", "revise"] = "proceed"

    # Provided when step != intake
    book_spec: dict[str, Any] | None = None
    book_outline: dict[str, Any] | None = None
    user_display_name: str | None = Field(
        default=None,
        description="Logged-in user's greeting name; skips name onboarding",
    )
    intake_collaborative: bool = Field(
        default=False,
        description="User chose 'build together'; AI infers BSO and leads with proposals",
    )
    intake_collaborative_ack: bool = Field(
        default=False,
        description="User confirmed collaborative brief (Sounds good); finalize intake + gate",
    )


def _sse(event: str, data: dict[str, Any] | None = None) -> str:
    payload = data or {}
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


@router.post("/chat/unified/stream")
async def unified_stream(payload: UnifiedChatStepRequest) -> StreamingResponse:
    message = (payload.message or "").strip()
    history = payload.history or []
    settings = get_settings()
    step = payload.step
    action = payload.action

    intake_message_id = str(uuid.uuid4())
    outline_message_id = str(uuid.uuid4())
    preview_message_id = str(uuid.uuid4())
    gate_message_id = str(uuid.uuid4())

    def event_stream() -> Iterator[str]:
        try:
            if step == "intake":
                known_name = (payload.user_display_name or "").strip() or None
                collab = bool(payload.intake_collaborative)
                default_pages = settings.default_target_length_pages

                # User tapped "Sounds good" after a deferred collaborative brief — no second LLM.
                if payload.intake_collaborative_ack:
                    if not collab:
                        raise HTTPException(
                            status_code=400,
                            detail="intake_collaborative_ack requires intake_collaborative",
                        )
                    if not payload.book_spec:
                        raise HTTPException(
                            status_code=400,
                            detail="book_spec is required for collaborative ack",
                        )
                    spec_raw = dict(payload.book_spec)
                    valid, v_err = validate_bso(spec_raw)
                    if not valid:
                        yield _sse(
                            "error",
                            {"message": "Invalid book_spec: " + "; ".join(v_err)},
                        )
                        yield _sse("done", {})
                        return

                    ack_text = (
                        "Perfect — your book brief is set. When you're ready, use **Proceed to outline** below."
                    )
                    yield _sse(
                        "message_start",
                        {
                            "messageId": intake_message_id,
                            "role": "assistant",
                            "kind": "intake",
                        },
                    )
                    chunk_size = 64
                    for i in range(0, len(ack_text), chunk_size):
                        yield _sse(
                            "message_delta",
                            {
                                "messageId": intake_message_id,
                                "delta": ack_text[i : i + chunk_size],
                            },
                        )
                    yield _sse("message_end", {"messageId": intake_message_id})

                    yield _sse(
                        "book_spec_ready",
                        {
                            "messageId": intake_message_id,
                            "intakeComplete": True,
                            "bookSpec": spec_raw,
                            "offerCollaborativeFeedback": False,
                        },
                    )

                    gate_text = (
                        "Your book brief is complete. Generate the structured outline next, "
                        "or tell me what to change about your requirements."
                    )
                    yield _sse(
                        "message_start",
                        {
                            "messageId": gate_message_id,
                            "role": "assistant",
                            "kind": "gate",
                            "content": gate_text,
                            "gateStage": "outline",
                        },
                    )
                    yield _sse("message_end", {"messageId": gate_message_id})
                    yield _sse("done", {})
                    return

                if not message:
                    raise HTTPException(status_code=400, detail="message is required for intake")

                # Single structured intake call — reply + BSO + intake_complete must agree.
                result = run_intake(
                    message=message,
                    history=history,
                    provider=None,
                    known_display_name=known_name,
                    collaborative=collab,
                    default_target_pages=default_pages,
                )
                book_spec = result.get("book_spec")
                intake_complete = bool(result.get("intake_complete"))
                reply_text = (result.get("content") or "").strip() or "…"

                defer_collab_confirm = collab and intake_complete and bool(book_spec)

                yield _sse(
                    "message_start",
                    {
                        "messageId": intake_message_id,
                        "role": "assistant",
                        "kind": "intake",
                    },
                )

                chunk_size = 64
                for i in range(0, len(reply_text), chunk_size):
                    yield _sse(
                        "message_delta",
                        {
                            "messageId": intake_message_id,
                            "delta": reply_text[i : i + chunk_size],
                        },
                    )

                yield _sse("message_end", {"messageId": intake_message_id})

                offer_cf = bool(result.get("offer_collaborative_feedback")) if collab else False
                if defer_collab_confirm:
                    offer_cf = True

                yield _sse(
                    "book_spec_ready",
                    {
                        "messageId": intake_message_id,
                        "intakeComplete": intake_complete and not defer_collab_confirm,
                        "bookSpec": book_spec,
                        "offerCollaborativeFeedback": offer_cf,
                    },
                )

                if intake_complete and book_spec and not defer_collab_confirm:
                    gate_text = (
                        "Your book brief is complete. Generate the structured outline next, "
                        "or tell me what to change about your requirements."
                    )
                    yield _sse(
                        "message_start",
                        {
                            "messageId": gate_message_id,
                            "role": "assistant",
                            "kind": "gate",
                            "content": gate_text,
                            "gateStage": "outline",
                        },
                    )
                    yield _sse("message_end", {"messageId": gate_message_id})

            elif step == "outline":
                if not payload.book_spec:
                    raise HTTPException(status_code=400, detail="book_spec is required for outline")
                revision_notes = message if action == "revise" and message else None

                yield _sse(
                    "message_start",
                    {"messageId": outline_message_id, "role": "assistant", "kind": "outline"},
                )
                outline, book_spec_used = run_outline(
                    book_spec=payload.book_spec,
                    revision_notes=revision_notes,
                )
                yield _sse(
                    "outline_ready",
                    {
                        "messageId": outline_message_id,
                        "outline": outline,
                        "bookSpec": book_spec_used,
                    },
                )
                yield _sse("message_end", {"messageId": outline_message_id})

                gate_text = (
                    "Preview is next. Would you like to proceed to preview, "
                    "or change anything about the outline?"
                )
                yield _sse(
                    "message_start",
                    {
                        "messageId": gate_message_id,
                        "role": "assistant",
                        "kind": "gate",
                        "content": gate_text,
                        "gateStage": "preview",
                    },
                )
                yield _sse("message_end", {"messageId": gate_message_id})

            elif step == "preview":
                if not payload.book_spec or not payload.book_outline:
                    raise HTTPException(
                        status_code=400,
                        detail="book_spec and book_outline are required for preview",
                    )
                revision_notes = message if action == "revise" and message else None
                book_spec_for_preview = merge_target_pages_from_revision_into_spec(
                    dict(payload.book_spec),
                    revision_notes,
                )

                yield _sse(
                    "message_start",
                    {"messageId": preview_message_id, "role": "assistant", "kind": "preview"},
                )
                preview_markdown = run_preview(
                    book_spec=book_spec_for_preview,
                    book_outline=payload.book_outline,
                    revision_notes=revision_notes,
                )
                yield _sse(
                    "preview_ready",
                    {
                        "messageId": preview_message_id,
                        "previewMarkdown": preview_markdown,
                        "bookSpec": book_spec_for_preview,
                    },
                )
                yield _sse("message_end", {"messageId": preview_message_id})

                gate_text = (
                    "Your preview is ready. You can pay $1 for an AI-generated book cover, "
                    "unlock the full book, or tell us what to change in the preview."
                )
                yield _sse(
                    "message_start",
                    {
                        "messageId": gate_message_id,
                        "role": "assistant",
                        "kind": "gate",
                        "content": gate_text,
                        "gateStage": "post_preview",
                    },
                )
                yield _sse("message_end", {"messageId": gate_message_id})

            else:
                yield _sse("done", {})
                return

            yield _sse("done", {})
        except ValueError as e:
            yield _sse("error", {"message": str(e)})
            yield _sse("done", {})
        except Exception as e:
            yield _sse(
                "error",
                {"message": f"{type(e).__name__}: {e}"},
            )
            yield _sse("done", {})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
        },
    )

