"""Outline API: generate book outline from BSO (via LangGraph)."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.agents.graph import get_book_pipeline_graph
from api.state.schema import BookOutline
from api.tracing import graph_config

router = APIRouter(prefix="/api", tags=["outline"])


class OutlineRequest(BaseModel):
    """Request: book_spec (BSO dict) from intake."""

    book_spec: dict = Field(..., description="Book Specification Object from chat intake")


@router.post("/outline")
async def create_outline(payload: OutlineRequest) -> dict:
    """
    Generate a chapter outline from a Book Specification. Runs through LangGraph for tracing.
    """
    try:
        graph = get_book_pipeline_graph()
        state = {"stage": "outline", "book_spec": payload.book_spec}
        config = graph_config("outline", stage="outline")
        result = graph.invoke(state, config=config)
        outline_dict = result.get("book_outline")
        if not outline_dict:
            raise HTTPException(status_code=500, detail="Outline agent returned no outline")
        BookOutline.model_validate(outline_dict)
        return outline_dict
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
