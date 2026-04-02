"""Service-to-service endpoint invoked by the Go generation worker."""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Response
from pydantic import BaseModel, Field

from api.config import get_settings
from api.services.generation_internal import run_full_generation, run_preview_generation

router = APIRouter(tags=["internal"])


class GenerateBody(BaseModel):
    book_id: int = Field(..., ge=1)
    kind: Literal["preview_generation", "full_generation"]


def _verify_internal_bearer(authorization: str | None) -> None:
    expected = (get_settings().internal_api_key or "").strip()
    if not expected:
        raise HTTPException(status_code=500, detail="INTERNAL_API_KEY is not configured")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization[7:].strip()
    if token != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post("/internal/generate")
def internal_generate(
    payload: GenerateBody,
    background_tasks: BackgroundTasks,
    authorization: Annotated[str | None, Header()] = None,
) -> Response:
    """
    Go worker POSTs {book_id, kind}. Full book runs in a background task and returns 202.
    Preview runs synchronously and returns 200 when the callback to Go has completed.
    """
    _verify_internal_bearer(authorization)
    if payload.kind == "full_generation":
        background_tasks.add_task(run_full_generation, payload.book_id)
        return Response(status_code=202)
    run_preview_generation(payload.book_id)
    return Response(status_code=200)
