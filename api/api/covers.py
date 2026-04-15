"""Cover image routes (OpenAI Images API, independent of LangChain text pipeline)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.services.cover_service import generate_cover_image

router = APIRouter(prefix="/api/cover", tags=["cover"])


class GenerateCoverRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Prompt for cover generation")
    output_basename: str | None = Field(
        default=None,
        description="Optional file basename (without extension)",
    )
    size: str = Field(default="1024x1536", description="Image size")
    quality: str = Field(default="medium", description="Image quality")
    output_format: str = Field(default="png", description="Image format")
    model: str | None = Field(
        default=None,
        description="Override model (defaults to OPENAI_IMAGE_MODEL / gpt-image-1)",
    )


class GenerateCoverResponse(BaseModel):
    file_path: str


@router.post("/generate-cover-image", response_model=GenerateCoverResponse)
async def create_cover(payload: GenerateCoverRequest) -> GenerateCoverResponse:
    try:
        file_path = generate_cover_image(
            prompt=payload.prompt,
            output_basename=payload.output_basename,
            size=payload.size,
            quality=payload.quality,
            output_format=payload.output_format,
            model=payload.model,
        )
        return GenerateCoverResponse(file_path=file_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

