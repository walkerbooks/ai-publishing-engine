"""Chat API: intake conversation and BSO extraction."""

import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.agents.intake_agent import run_intake

router = APIRouter(prefix="/api", tags=["chat"])


class ChatRequest(BaseModel):
    """Request body: message and optional history for stateless intake."""

    message: str = Field(..., min_length=1)
    session_id: str | None = None
    history: list[dict[str, str]] = Field(default_factory=list)


@router.post("/chat")
async def chat(payload: ChatRequest) -> dict:
    """
    One intake turn. Client sends message and conversation history.
    Returns assistant reply; when BSO is complete, returns book_spec and book_id.
    """
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")
    history = payload.history or []

    try:
        result = run_intake(message=message, history=history)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    content = result["content"]
    book_spec = result.get("book_spec")
    intake_complete = result.get("intake_complete", False)
    book_id = str(uuid.uuid4()) if intake_complete and book_spec else None

    return {
        "content": content,
        "book_spec": book_spec,
        "intake_complete": intake_complete,
        "book_id": book_id,
    }
