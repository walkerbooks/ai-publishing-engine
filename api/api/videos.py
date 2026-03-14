"""Videos API: YouTube search for onboarding block."""

from fastapi import APIRouter

from api.services.youtube import search_videos

router = APIRouter(prefix="/api", tags=["videos"])

# Tightly coupled to making money with ebooks (not journals, not generic Amazon selling)
DEFAULT_VIDEO_QUERY = "make money selling ebooks on Amazon KDP"


@router.get("/videos")
async def get_videos(
    q: str = DEFAULT_VIDEO_QUERY,
    max_results: int = 10,
    order: str = "viewCount",
) -> dict:
    """
    Search YouTube for videos. Default order=viewCount (highest views first).
    Returns list of {title, thumbnail_url, video_id, link}.
    """
    videos = search_videos(q=q, max_results=max_results, order=order)
    return {"videos": videos}
