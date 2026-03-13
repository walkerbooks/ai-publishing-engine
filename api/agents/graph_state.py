"""LangGraph state: single TypedDict used by the pipeline graph."""

from typing import TypedDict


class BookPipelineState(TypedDict, total=False):
    """State for the book pipeline graph (intake → outline → preview)."""

    stage: str
    message: str
    history: list[dict]
    content: str
    book_spec: dict | None
    book_outline: dict | None
    preview_content: str | None
    intake_complete: bool
