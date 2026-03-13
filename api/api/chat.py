"""Chat API: intake conversation and BSO extraction (via LangGraph)."""

import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.agents.graph import get_book_pipeline_graph
from api.tracing import graph_config

router = APIRouter(prefix="/api", tags=["chat"])


class ChatRequest(BaseModel):
    """Request body: message and optional history for stateless intake."""

    message: str = Field(..., min_length=1)
    session_id: str | None = None
    history: list[dict[str, str]] = Field(default_factory=list)


@router.post("/chat")
async def chat(payload: ChatRequest) -> dict:
    """
    One intake turn. Runs through LangGraph for LangSmith tracing.
    Returns assistant reply; when BSO is complete, returns book_spec and book_id.
    """
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")
    history = payload.history or []

    try:
        graph = get_book_pipeline_graph()
        state = {"stage": "intake", "message": message, "history": history}
        config = graph_config(
            "chat",
            thread_id=payload.session_id,
            stage="intake",
            session_id=payload.session_id or "",
        )
        result = graph.invoke(state, config=config)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    content = result.get("content", "")
    book_spec = result.get("book_spec")
    intake_complete = result.get("intake_complete", False)
    book_id = str(uuid.uuid4()) if intake_complete and book_spec else None

    return {
        "content": content,
        "book_spec": book_spec,
        "intake_complete": intake_complete,
        "book_id": book_id,
    }
