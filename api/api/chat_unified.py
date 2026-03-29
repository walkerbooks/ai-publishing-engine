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
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage

from api.agents.intake_agent import run_intake
from api.agents.outline_agent import run_outline
from api.agents.preview_agent import run_preview
from api.agents.prompts.intake import build_intake_reply_system
from api.config import get_settings
from api.llm.factory import get_llm

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


def _history_to_messages(history: list[dict[str, Any]]) -> list[BaseMessage]:
    out: list[BaseMessage] = []
    for m in history:
        role = m.get("role", "user")
        content = m.get("content", "")
        if role == "user":
            out.append(HumanMessage(content=content))
        else:
            out.append(AIMessage(content=content))
    return out


def _sse(event: str, data: dict[str, Any] | None = None) -> str:
    payload = data or {}
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


@router.post("/chat/unified/stream")
async def unified_stream(payload: UnifiedChatStepRequest) -> StreamingResponse:
    message = (payload.message or "").strip()
    history = payload.history or []
    settings = get_settings()
    provider = settings.llm_provider

    step = payload.step
    action = payload.action

    intake_message_id = str(uuid.uuid4())
    outline_message_id = str(uuid.uuid4())
    preview_message_id = str(uuid.uuid4())
    gate_message_id = str(uuid.uuid4())

    def event_stream() -> Iterator[str]:
        try:
            if step == "intake":
                if not message:
                    raise HTTPException(status_code=400, detail="message is required for intake")

                known_name = (payload.user_display_name or "").strip() or None
                intake_reply_system = build_intake_reply_system(known_name)

                yield _sse(
                    "message_start",
                    {
                        "messageId": intake_message_id,
                        "role": "assistant",
                        "kind": "intake",
                    },
                )

                # Stream intake reply text.
                if str(provider).lower() == "openai":
                    llm = get_llm(provider=None, streaming=True)
                    messages: list[BaseMessage] = [
                        SystemMessage(content=intake_reply_system),
                        *_history_to_messages(history),
                        HumanMessage(content=message),
                    ]
                    for chunk in llm.stream(messages):
                        delta = getattr(chunk, "content", None) or ""
                        if delta:
                            yield _sse(
                                "message_delta",
                                {"messageId": intake_message_id, "delta": delta},
                            )
                else:
                    llm = get_llm(provider=None, streaming=False)
                    messages = [
                        SystemMessage(content=intake_reply_system),
                        *_history_to_messages(history),
                        HumanMessage(content=message),
                    ]
                    res = llm.invoke(messages)
                    full = getattr(res, "content", None) or str(res)
                    yield _sse(
                        "message_delta",
                        {"messageId": intake_message_id, "delta": full},
                    )

                yield _sse("message_end", {"messageId": intake_message_id})

                result = run_intake(
                    message=message,
                    history=history,
                    provider=None,
                    known_display_name=known_name,
                )
                book_spec = result.get("book_spec")
                intake_complete = bool(result.get("intake_complete"))

                yield _sse(
                    "book_spec_ready",
                    {
                        "messageId": intake_message_id,
                        "intakeComplete": intake_complete,
                        "bookSpec": book_spec,
                    },
                )

                if intake_complete and book_spec:
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
                outline = run_outline(book_spec=payload.book_spec, revision_notes=revision_notes)
                yield _sse(
                    "outline_ready",
                    {"messageId": outline_message_id, "outline": outline},
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

                yield _sse(
                    "message_start",
                    {"messageId": preview_message_id, "role": "assistant", "kind": "preview"},
                )
                preview_markdown = run_preview(
                    book_spec=payload.book_spec,
                    book_outline=payload.book_outline,
                    revision_notes=revision_notes,
                )
                yield _sse(
                    "preview_ready",
                    {"messageId": preview_message_id, "previewMarkdown": preview_markdown},
                )
                yield _sse("message_end", {"messageId": preview_message_id})

                gate_text = (
                    "Preview is ready. Would you like to unlock the full book, "
                    "or change anything in the preview?"
                )
                yield _sse(
                    "message_start",
                    {
                        "messageId": gate_message_id,
                        "role": "assistant",
                        "kind": "gate",
                        "content": gate_text,
                        "gateStage": "full",
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

