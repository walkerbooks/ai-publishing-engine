"""HTTP client for the Go API (internal routes)."""

from __future__ import annotations

import json
from typing import Any

import httpx

from api.config import get_settings


def _base_url() -> str:
    s = get_settings()
    u = (s.backend_url or "").strip().rstrip("/")
    if not u:
        raise ValueError("BACKEND_URL is not set in the environment")
    return u


def _headers() -> dict[str, str]:
    s = get_settings()
    key = (s.internal_api_key or "").strip()
    if not key:
        raise ValueError("INTERNAL_API_KEY is not set")
    return {
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def fetch_book_by_internal_id(book_id: int) -> dict[str, Any]:
    """GET /api/v1/internal/books/{id} — service-to-service. ``book_id`` is the numeric internal id."""
    url = f"{_base_url()}/api/v1/internal/books/{book_id}"
    with httpx.Client(timeout=60.0) as client:
        r = client.get(url, headers=_headers())
    if r.status_code >= 400:
        raise RuntimeError(f"fetch book failed: HTTP {r.status_code} {r.text[:500]}")
    return r.json()


def fetch_internal_chapters(book_id: int) -> list[dict[str, Any]]:
    """GET /api/v1/internal/books/{id}/chapters — ordered by chapter_number."""
    url = f"{_base_url()}/api/v1/internal/books/{book_id}/chapters"
    with httpx.Client(timeout=60.0) as client:
        r = client.get(url, headers=_headers())
    if r.status_code >= 400:
        raise RuntimeError(f"fetch chapters failed: HTTP {r.status_code} {r.text[:500]}")
    data = r.json()
    ch = data.get("chapters")
    return ch if isinstance(ch, list) else []


def patch_book_sync_state(book_id: int, sync_state: dict[str, Any]) -> None:
    """PATCH /api/v1/internal/books/{id}/sync-state"""
    url = f"{_base_url()}/api/v1/internal/books/{book_id}/sync-state"
    payload = json.dumps({"sync_state": sync_state})
    with httpx.Client(timeout=30.0) as client:
        r = client.patch(url, headers=_headers(), content=payload)
    if r.status_code >= 400:
        raise RuntimeError(f"patch sync_state failed: HTTP {r.status_code} {r.text[:500]}")


def post_ai_callback(body: dict[str, Any]) -> None:
    """POST /api/v1/internal/ai/callback"""
    url = f"{_base_url()}/api/v1/internal/ai/callback"
    payload = json.dumps(body)
    with httpx.Client(timeout=120.0) as client:
        r = client.post(url, headers=_headers(), content=payload)
    if r.status_code >= 400:
        raise RuntimeError(f"callback failed: HTTP {r.status_code} {r.text[:500]}")


def post_ai_progress(body: dict[str, Any]) -> None:
    """POST /api/v1/internal/ai/progress"""
    url = f"{_base_url()}/api/v1/internal/ai/progress"
    payload = json.dumps(body)
    with httpx.Client(timeout=30.0) as client:
        r = client.post(url, headers=_headers(), content=payload)
    if r.status_code >= 400:
        raise RuntimeError(f"progress failed: HTTP {r.status_code} {r.text[:500]}")
