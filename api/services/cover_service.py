"""Cover image generation via OpenAI Images API."""

from __future__ import annotations

import base64
import re
import uuid
from pathlib import Path

from api.config import get_settings
from api.services.image_factory import get_image_client

_REPO_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_COVER_DIR = _REPO_ROOT / "var" / "cover_images"

_FORBIDDEN_FILENAME = '<>:"/\\|?*' + "".join(chr(i) for i in range(32))

# Distinct visual directions so the user gets three meaningfully different options.
_COVER_VARIANT_HINTS = (
    "Visual direction — option 1 of 3: warm palette, cinematic rim light, heroic focal point, strong readable title treatment.",
    "Visual direction — option 2 of 3: cool high-contrast palette, bold graphic shapes, modern editorial poster typography.",
    "Visual direction — option 3 of 3: soft refined palette, elegant negative space, typography-forward minimal composition.",
)


def _cover_storage_dir() -> Path:
    """Resolve cover storage; fall back to repo `var/cover_images` if env points at root or is empty."""
    raw = (get_settings().cover_image_storage_dir or "").strip()
    if not raw or raw in ("/", "\\", ".", ".."):
        return _DEFAULT_COVER_DIR.resolve()
    try:
        p = Path(raw).expanduser().resolve()
    except OSError:
        return _DEFAULT_COVER_DIR.resolve()
    # Avoid writing to filesystem root (common misconfiguration: COVER_IMAGE_STORAGE_DIR=/)
    if p == Path("/").resolve() or p == Path(".").resolve():
        return _DEFAULT_COVER_DIR.resolve()
    return p


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
    return_bytes: bool = False,
) -> str | tuple[str, bytes]:
    """
    Generate and persist a cover image.

    Returns absolute path to the written file, or (path, raw_bytes) when return_bytes is True.
    """
    text = (prompt or "").strip()
    if not text:
        raise ValueError("prompt is required")

    settings = get_settings()
    image_model = model or settings.openai_image_model
    storage = _cover_storage_dir()
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
    path_str = str(out_path)
    if return_bytes:
        return path_str, image_bytes
    return path_str


def generate_cover_variants(
    base_prompt: str,
    *,
    count: int = 3,
    output_basename_stem: str | None = None,
    size: str = "1024x1536",
    quality: str = "medium",
    output_format: str = "png",
    model: str | None = None,
) -> list[tuple[str, bytes]]:
    """
    Generate up to three distinct cover images from the same BSO/outline-derived base prompt.
    Returns list of (absolute_path, raw_bytes) in order.
    """
    n = max(1, min(3, int(count)))
    base = (base_prompt or "").strip()
    if not base:
        raise ValueError("prompt is required")
    stem = _safe_file_stem(output_basename_stem or f"cover-{uuid.uuid4().hex[:8]}")
    out: list[tuple[str, bytes]] = []
    for i in range(n):
        hint = _COVER_VARIANT_HINTS[i] if i < len(_COVER_VARIANT_HINTS) else _COVER_VARIANT_HINTS[-1]
        full_prompt = f"{base}\n\n{hint}"
        suffix = f"{stem}-v{i + 1}"
        path_raw = generate_cover_image(
            full_prompt,
            output_basename=suffix,
            size=size,
            quality=quality,
            output_format=output_format,
            model=model,
            return_bytes=True,
        )
        path_str, raw = path_raw
        out.append((path_str, raw))
    return out

