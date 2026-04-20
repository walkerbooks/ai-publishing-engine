"""Cover image routes (OpenAI Images API, independent of LangChain text pipeline)."""

from __future__ import annotations

import base64

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from api.services.cover_service import generate_cover_image, generate_cover_variants

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
    include_base64: bool = Field(
        default=False,
        description="If true, include image_base64 (raw, no data: prefix) for inline display",
    )


class GenerateCoverResponse(BaseModel):
    file_path: str
    image_base64: str | None = None


@router.post("/generate-cover-image", response_model=GenerateCoverResponse)
async def create_cover(payload: GenerateCoverRequest) -> GenerateCoverResponse:
    try:
        if payload.include_base64:
            path_raw = generate_cover_image(
                prompt=payload.prompt,
                output_basename=payload.output_basename,
                size=payload.size,
                quality=payload.quality,
                output_format=payload.output_format,
                model=payload.model,
                return_bytes=True,
            )
            file_path, raw = path_raw
            return GenerateCoverResponse(
                file_path=file_path,
                image_base64=base64.b64encode(raw).decode("ascii"),
            )

        file_path = generate_cover_image(
            prompt=payload.prompt,
            output_basename=payload.output_basename,
            size=payload.size,
            quality=payload.quality,
            output_format=payload.output_format,
            model=payload.model,
        )
        return GenerateCoverResponse(file_path=str(file_path))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


class CoverVariantItem(BaseModel):
    file_path: str
    image_base64: str


class GenerateCoverVariantsRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Base prompt (e.g. from BSO + outline)")
    count: int = Field(default=3, ge=1, le=3, description="Number of distinct variants to generate")
    output_basename: str | None = Field(
        default=None,
        description="Optional stem for saved files (suffix -v1, -v2, … added)",
    )
    size: str = Field(default="1024x1536", description="Image size")
    quality: str = Field(default="medium", description="Image quality")
    output_format: str = Field(default="png", description="Image format")
    model: str | None = Field(default=None, description="Override image model")


class GenerateCoverVariantsResponse(BaseModel):
    images: list[CoverVariantItem]


@router.post("/generate-cover-variants", response_model=GenerateCoverVariantsResponse)
async def create_cover_variants(
    payload: GenerateCoverVariantsRequest,
) -> GenerateCoverVariantsResponse:
    try:
        rows = generate_cover_variants(
            payload.prompt,
            count=payload.count,
            output_basename_stem=payload.output_basename,
            size=payload.size,
            quality=payload.quality,
            output_format=payload.output_format,
            model=payload.model,
        )
        images: list[CoverVariantItem] = []
        for path_str, raw in rows:
            images.append(
                CoverVariantItem(
                    file_path=path_str,
                    image_base64=base64.b64encode(raw).decode("ascii"),
                )
            )
        return GenerateCoverVariantsResponse(images=images)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

