"""Outline API: generate book outline from BSO."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.agents.outline_agent import run_outline
from api.state.schema import BookOutline

router = APIRouter(prefix="/api", tags=["outline"])


class OutlineRequest(BaseModel):
    """Request: book_spec (BSO dict) from intake."""

    book_spec: dict = Field(..., description="Book Specification Object from chat intake")


@router.post("/outline")
async def create_outline(payload: OutlineRequest) -> dict:
    """
    Generate a chapter outline from a Book Specification.
    Returns BookOutline (book_title, chapters with titles/subtopics/word_target, etc.).
    """
    try:
        outline_dict = run_outline(book_spec=payload.book_spec)
        BookOutline.model_validate(outline_dict)
        return outline_dict
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
