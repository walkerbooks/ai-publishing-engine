"""Cover image generation via OpenAI Images API."""

from __future__ import annotations

import base64
import re
import uuid
from pathlib import Path

from api.config import get_settings
from api.services.image_factory import get_image_client


_FORBIDDEN_FILENAME = '<>:"/\\|?*' + "".join(chr(i) for i in range(32))


def _safe_file_stem(raw: str) -> str:
    stem = "".join(c for c in raw if c not in _FORBIDDEN_FILENAME).strip()
    stem = re.sub(r"\s+", "-", stem)
    stem = re.sub(r"[^a-zA-Z0-9_.-]", "", stem)
    stem = stem.strip(".-")
    return stem[:80] or f"cover-{uuid.uuid4().hex[:12]}"


def generate_cover_image(
    prompt: str,
    *,
    output_basename: str | None = None,
    size: str = "1024x1536",
    quality: str = "medium",
    output_format: str = "png",
    model: str | None = None,
) -> str:
    """
    Generate and persist a cover image.

    Returns absolute path to the written file.
    """
    text = (prompt or "").strip()
    if not text:
        raise ValueError("prompt is required")

    settings = get_settings()
    image_model = model or settings.openai_image_model
    storage = Path(settings.cover_image_storage_dir).resolve()
    storage.mkdir(parents=True, exist_ok=True)

    client = get_image_client()
    response = client.images.generate(
        model=image_model,
        prompt=text,
        size=size,
        quality=quality,
        output_format=output_format,
    )

    data = getattr(response, "data", None) or []
    if not data or not getattr(data[0], "b64_json", None):
        raise RuntimeError("OpenAI Images API returned no image data")

    image_bytes = base64.b64decode(data[0].b64_json)
    ext = output_format.lower().strip() or "png"
    name = _safe_file_stem(output_basename or f"cover-{uuid.uuid4().hex[:8]}")
    out_path = storage / f"{name}.{ext}"
    out_path.write_bytes(image_bytes)
    return str(out_path)

