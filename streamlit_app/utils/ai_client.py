"""HTTP client for the AI API (FastAPI). Used by Streamlit pages."""

import os
from typing import Any

import httpx

DEFAULT_AI_API_URL = "http://localhost:8000"


def get_ai_api_url() -> str:
    return os.getenv("AI_API_URL", DEFAULT_AI_API_URL)


def chat(
    message: str,
    history: list[dict[str, str]],
    session_id: str | None = None,
) -> dict[str, Any]:
    """
    Send one chat message to the AI API intake endpoint.
    Returns dict with content, book_spec, intake_complete, book_id.
    """
    url = f"{get_ai_api_url().rstrip('/')}/api/chat"
    payload = {
        "message": message,
        "session_id": session_id,
        "history": history,
    }
    with httpx.Client(timeout=60.0) as client:
        resp = client.post(url, json=payload)
        resp.raise_for_status()
        return resp.json()


def outline(book_spec: dict) -> dict:
    """
    Request a chapter outline from the AI API given a Book Specification.
    Returns the outline dict (book_title, chapters, total_word_target, etc.).
    """
    url = f"{get_ai_api_url().rstrip('/')}/api/outline"
    with httpx.Client(timeout=120.0) as client:
        resp = client.post(url, json={"book_spec": book_spec})
        resp.raise_for_status()
        return resp.json()


def videos(q: str = "make money selling ebooks on Amazon KDP", max_results: int = 10) -> dict:
    """
    Fetch YouTube videos for the onboarding block.
    Returns dict with "videos" list of {title, thumbnail_url, video_id, link}.
    """
    url = f"{get_ai_api_url().rstrip('/')}/api/videos"
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(url, params={"q": q, "max_results": max_results})
        resp.raise_for_status()
        return resp.json()


def preview(book_spec: dict, book_outline: dict) -> dict[str, Any]:
    """
    Request a 6–8 page preview from the AI API (intro + first chapter).
    Returns dict with preview_content (markdown string).
    """
    url = f"{get_ai_api_url().rstrip('/')}/api/preview"
    with httpx.Client(timeout=180.0) as client:
        resp = client.post(
            url,
            json={"book_spec": book_spec, "book_outline": book_outline},
        )
        resp.raise_for_status()
        return resp.json()
