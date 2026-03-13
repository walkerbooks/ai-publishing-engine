"""Preview API: generate 6–8 page preview from BSO + outline."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.agents.preview_agent import run_preview

router = APIRouter(prefix="/api", tags=["preview"])


class PreviewRequest(BaseModel):
    """Request: book_spec and book_outline from previous steps."""

    book_spec: dict = Field(..., description="Book Specification from intake")
    book_outline: dict = Field(..., description="Book outline from outline agent")


@router.post("/preview")
async def create_preview(payload: PreviewRequest) -> dict:
    """
    Generate a 6–8 page preview (intro + first chapter) as markdown.
    """
    try:
        content = run_preview(
            book_spec=payload.book_spec,
            book_outline=payload.book_outline,
        )
        return {"preview_content": content}
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
