"""Resolve AI-generated cover image bytes for manuscript export (PDF/DOCX).

**Go internal book contract** (``GET /api/v1/internal/books/{bookID}`` — use the book’s
numeric internal id, not ``public_id``; service-to-service auth only, never from the browser):

- ``cover_image_png`` — JSON string, standard base64 of the stored image (Go’s encoding for
  ``[]byte``). Omitted or empty when no cover is on the row.
- ``cover_image_mime`` — e.g. ``image/png`` or ``image/jpeg`` (metadata; we still detect format
  from magic bytes after decode).
- Optional metadata only: ``cover_variant_chosen``, ``cover_image_source_message_id``,
  ``cover_image_updated_at`` (ignored here).

Pass the parsed JSON object as ``book`` to ``extract_illustrated_cover_bytes(book)``. If the
field is missing or decode yields no valid PNG/JPEG, the row has no linked cover — re-run export
after the conversation flow persists the cover onto the book.

**Also supported:** legacy/alternate keys (camelCase, ``sync_state``, ``illustrated_cover`` nest),
raw ``bytes``/``bytearray`` on a key, ``data:image/...;base64,...`` strings.

Only PNG and JPEG payloads are accepted (magic-byte check). Very large strings are capped before
decode.
"""

from __future__ import annotations

import base64
import binascii
import re
from typing import Any

_MAX_B64_CHARS = 40_000_000  # ~30 MB decoded upper bound for base64 text

_DATA_URL_PREFIX = re.compile(r"^data:image/(?:png|jpeg|jpg);base64,", re.I)


def _strip_data_url(s: str) -> str:
    t = s.strip()
    if t.lower().startswith("data:"):
        t = _DATA_URL_PREFIX.sub("", t, count=1)
    return re.sub(r"\s+", "", t)


def _b64_decode_image(s: str) -> bytes | None:
    raw = _strip_data_url(s)
    if not raw or len(raw) > _MAX_B64_CHARS:
        return None
    pad = (-len(raw)) % 4
    if pad:
        raw += "=" * pad
    for decoder in (base64.standard_b64decode, base64.urlsafe_b64decode):
        try:
            out = decoder(raw)
        except (binascii.Error, ValueError):
            continue
        if _is_png(out) or _is_jpeg(out):
            return out
    return None


def _is_png(b: bytes) -> bool:
    return len(b) >= 8 and b[:8] == b"\x89PNG\r\n\x1a\n"


def _is_jpeg(b: bytes) -> bool:
    return len(b) >= 3 and b[:3] == b"\xff\xd8\xff"


def _coalesce_str(*vals: Any) -> str | None:
    for v in vals:
        if v is None:
            continue
        if isinstance(v, str) and v.strip():
            return v
        if isinstance(v, (bytes, bytearray)):
            try:
                s = bytes(v).decode("utf-8")
            except UnicodeDecodeError:
                continue
            if s.strip():
                return s
    return None


def _try_value_as_image_bytes(val: Any) -> bytes | None:
    """If ``val`` is already image bytes, or base64 text, return decoded PNG/JPEG bytes."""
    if val is None:
        return None
    if isinstance(val, (bytes, bytearray)):
        b = bytes(val)
        if _is_png(b) or _is_jpeg(b):
            return b
        return None
    if isinstance(val, list) and len(val) >= 24:
        try:
            b = bytes(val)
        except (TypeError, ValueError, OverflowError):
            return None
        if _is_png(b) or _is_jpeg(b):
            return b
        return None
    if isinstance(val, str):
        return _b64_decode_image(val)
    return None


def _image_field_candidates(book: dict[str, Any]) -> list[str | None]:
    """Collect possible base64 string fields from book and nested sync_state."""
    out: list[str | None] = []
    keys = (
        "cover_image_png",
        "CoverImagePng",
        "coverImagePng",
        "cover_image_base64",
        "CoverImageBase64",
        "coverImageBase64",
        "illustrated_cover_png_base64",
        "IllustratedCoverPngBase64",
        "selected_cover_png_base64",
        "SelectedCoverPngBase64",
    )
    for k in keys:
        out.append(_coalesce_str(book.get(k)))

    sync = book.get("sync_state")
    if isinstance(sync, dict):
        for k in keys:
            out.append(_coalesce_str(sync.get(k)))

    nested = book.get("illustrated_cover")
    if isinstance(nested, dict):
        out.append(_coalesce_str(nested.get("png_base64")))
        out.append(_coalesce_str(nested.get("image_base64")))

    return out


def extract_illustrated_cover_bytes(book: dict[str, Any]) -> bytes | None:
    """Decode illustrated cover from the internal book JSON (see module docstring). Returns
    ``None`` if missing, empty, or not a valid PNG/JPEG after decode."""
    if not isinstance(book, dict):
        return None
    raw_keys = (
        "cover_image_png",
        "CoverImagePng",
        "coverImagePng",
        "cover_image_base64",
        "CoverImageBase64",
        "coverImageBase64",
        "illustrated_cover_png_base64",
        "selected_cover_png_base64",
    )
    for k in raw_keys:
        raw = _try_value_as_image_bytes(book.get(k))
        if raw:
            return raw

    sync = book.get("sync_state")
    if isinstance(sync, dict):
        for k in raw_keys:
            raw = _try_value_as_image_bytes(sync.get(k))
            if raw:
                return raw

    nested = book.get("illustrated_cover")
    if isinstance(nested, dict):
        for subk in ("png_base64", "image_base64", "bytes"):
            raw = _try_value_as_image_bytes(nested.get(subk))
            if raw:
                return raw

    for cand in _image_field_candidates(book):
        if not cand:
            continue
        decoded = _b64_decode_image(cand)
        if decoded:
            return decoded
    return None


def image_pixel_dimensions(image_bytes: bytes) -> tuple[int, int] | None:
    """Return ``(width, height)`` in pixels for PNG or JPEG, or ``None``."""
    if _is_png(image_bytes) and len(image_bytes) >= 24:
        if image_bytes[12:16] != b"IHDR":
            return None
        w = int.from_bytes(image_bytes[16:20], "big")
        h = int.from_bytes(image_bytes[20:24], "big")
        if w > 0 and h > 0:
            return (w, h)
        return None
    if _is_jpeg(image_bytes):
        return _jpeg_sof_dimensions(image_bytes)
    return None


def _jpeg_sof_dimensions(data: bytes) -> tuple[int, int] | None:
    """Read height/width from first SOF0/SOF1/SOF2 marker."""
    i = 2
    n = len(data)
    while i + 9 < n:
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            h = int.from_bytes(data[i + 5 : i + 7], "big")
            w = int.from_bytes(data[i + 7 : i + 9], "big")
            if w > 0 and h > 0:
                return (w, h)
            return None
        seg_len = int.from_bytes(data[i + 2 : i + 4], "big")
        if seg_len < 2 or i + 2 + seg_len > n:
            return None
        i += 2 + seg_len
    return None
