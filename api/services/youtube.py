"""YouTube Data API v3 — search videos for onboarding block."""

import time
from typing import Any

from api.config import get_settings

# In-memory cache: (q, max_results, order) -> (result_list, expiry_time). Short TTL so results stay fresh.
_CACHE: dict[tuple[str, int, str], tuple[list[dict[str, Any]], float]] = {}
_CACHE_TTL_SECONDS = 600  # 10 minutes — dynamic results without burning quota


def search_videos(q: str, max_results: int = 10, order: str = "viewCount") -> list[dict[str, Any]]:
    """
    Search YouTube for videos. Returns list of {title, thumbnail_url, video_id, link}.
    Default order=viewCount so highest-viewed videos appear first. Cached 10 min.
    Returns [] if YOUTUBE_API_KEY is not set or on API errors.
    """
    key = (q.strip(), max_results, order)
    now = time.monotonic()
    if key in _CACHE:
        cached, expiry = _CACHE[key]
        if now < expiry:
            return cached
        del _CACHE[key]

    settings = get_settings()
    if not settings.youtube_api_key:
        return []

    try:
        from googleapiclient.discovery import build
    except ImportError:
        return []

    try:
        youtube = build(
            "youtube",
            "v3",
            developerKey=settings.youtube_api_key,
        )
        response = (
            youtube.search()
            .list(
                q=q,
                part="id,snippet",
                type="video",
                maxResults=min(max_results, 25),  # API cap is 25
                order=order,  # viewCount = highest views first
            )
            .execute()
        )
    except Exception:
        return []

    out: list[dict[str, Any]] = []
    for item in response.get("items", []):
        vid_id = item.get("id", {}).get("videoId")
        if not vid_id:
            continue
        snippet = item.get("snippet", {})
        thumbnails = snippet.get("thumbnails", {})
        thumb_url = (
            thumbnails.get("high", {}).get("url")
            or thumbnails.get("medium", {}).get("url")
            or thumbnails.get("default", {}).get("url")
            or ""
        )
        out.append({
            "title": snippet.get("title", ""),
            "thumbnail_url": thumb_url,
            "video_id": vid_id,
            "link": f"https://www.youtube.com/watch?v={vid_id}",
        })

    _CACHE[key] = (out, now + _CACHE_TTL_SECONDS)
    return out
