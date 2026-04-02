"""Internal generation jobs triggered by the Go worker (preview / full book)."""

from __future__ import annotations

import json
import logging
import traceback
from typing import Any

from api.agents.chapter_agent import run_chapter, summarize_chapter
from api.agents.preview_agent import run_preview
from api.agents.sync_state_agent import run_sync_state_update
from api.config import get_settings
from api.services.go_backend import (
    fetch_book_by_internal_id,
    fetch_internal_chapters,
    patch_book_sync_state,
    post_ai_callback,
    post_ai_progress,
)
from api.state.sync_state import merge_with_defaults

log = logging.getLogger(__name__)


def _parse_generation_context(description: str) -> tuple[dict[str, Any], dict[str, Any]]:
    raw = (description or "").strip()
    if not raw:
        raise ValueError(
            "book description is empty — PATCH the book with JSON containing book_spec and book_outline"
        )
    data = json.loads(raw)
    spec = data.get("book_spec")
    outline = data.get("book_outline")
    if not isinstance(spec, dict) or not isinstance(outline, dict):
        raise ValueError("book description JSON must include book_spec and book_outline objects")
    return spec, outline


def _preview_markdown_for_seeding(book: dict[str, Any], description: str) -> str | None:
    """
    When no chapters exist yet, full book chapter 1 should reuse the user-facing preview.
    Sources: Go books.preview_text, or optional description JSON field preview_markdown.
    """
    pt = book.get("preview_text")
    if pt and str(pt).strip():
        return str(pt).strip()
    try:
        data = json.loads((description or "").strip())
        pm = data.get("preview_markdown")
        if isinstance(pm, str) and pm.strip():
            return pm.strip()
    except Exception:
        pass
    return None


def _normalize_preview_chapter_title(
    public_id: str,
    sorted_db: list[dict[str, Any]],
    chapters_plan: list[Any],
) -> None:
    """If chapter 1 is the preview sample, retitle to outline chapter 1 (same body)."""
    if not sorted_db or not chapters_plan:
        return
    first = sorted_db[0]
    if str(first.get("title", "")).strip().lower() != "preview":
        return
    ch0 = chapters_plan[0]
    if not isinstance(ch0, dict):
        return
    proper = str(ch0.get("title", "Chapter 1"))[:255]
    content = str(first.get("content") or "")
    post_ai_callback(
        {
            "book_public_id": public_id,
            "status": "generating",
            "chapters": [
                {
                    "chapter_number": 1,
                    "title": proper,
                    "content": content,
                }
            ],
        }
    )
    first["title"] = proper


def _finalize_chapter_after_body(
    book_id: int,
    public_id: str,
    idx: int,
    title: str,
    body: str,
    sync: dict[str, Any],
    spec: dict[str, Any],
    provider: str | None,
) -> tuple[dict[str, Any], str]:
    """Persist chapter to Go, summarize, sync_state patch. Returns (sync, prev_excerpt tail)."""
    post_ai_callback(
        {
            "book_public_id": public_id,
            "status": "generating",
            "chapters": [
                {
                    "chapter_number": idx,
                    "title": title,
                    "content": body,
                }
            ],
        }
    )
    chapter_summary = summarize_chapter(body, provider=provider)
    summaries = list(sync.get("chapter_summaries") or [])
    summaries.append(chapter_summary)
    sync["chapter_summaries"] = summaries

    excerpt_tail = body[-8000:] if len(body) > 8000 else body
    updated = run_sync_state_update(
        sync,
        idx,
        title,
        chapter_summary,
        excerpt_tail,
        spec,
        provider=provider,
    )
    sync["narrative_arc"] = updated["narrative_arc"]
    sync["key_facts"] = updated["key_facts"]
    sync["open_threads"] = updated["open_threads"]
    sync["last_chapter_beat"] = updated["last_chapter_beat"]
    sync["tone_anchors"] = updated["tone_anchors"]
    sync["previous_excerpt_tail"] = excerpt_tail
    patch_book_sync_state(book_id, sync)

    prev_excerpt = body[-8000:] if len(body) > 8000 else body
    return sync, prev_excerpt


def _fail(book_public_id: str, message: str) -> None:
    post_ai_callback(
        {
            "book_public_id": book_public_id,
            "status": "failed",
            "error": message[:4000],
        }
    )


def _reconcile_summaries_from_db(
    sorted_chapters: list[dict[str, Any]],
    sync: dict[str, Any],
    provider: str | None,
) -> None:
    """Ensure chapter_summaries length matches stored chapters (resume after crash)."""
    summaries: list[str] = list(sync.get("chapter_summaries") or [])
    for i in range(len(summaries), len(sorted_chapters)):
        content = str(sorted_chapters[i].get("content") or "")
        summaries.append(summarize_chapter(content, provider=provider))
    sync["chapter_summaries"] = summaries


def run_preview_generation(book_id: int) -> None:
    settings = get_settings()
    provider = settings.llm_provider
    book = fetch_book_by_internal_id(book_id)
    public_id = str(book["public_id"])
    try:
        spec, outline = _parse_generation_context(str(book.get("description") or ""))
    except Exception as e:
        _fail(public_id, str(e))
        raise
    try:
        preview_md = run_preview(spec, outline, revision_notes=None, provider=provider)
    except Exception as e:
        _fail(public_id, f"preview agent: {e}")
        raise
    post_ai_callback(
        {
            "book_public_id": public_id,
            "status": "preview_ready",
            "chapters": [
                {
                    "chapter_number": 1,
                    "title": "Preview",
                    "content": preview_md,
                }
            ],
        }
    )


def run_full_generation(book_id: int) -> None:
    settings = get_settings()
    provider = settings.llm_provider
    book = fetch_book_by_internal_id(book_id)
    public_id = str(book["public_id"])
    try:
        spec, outline = _parse_generation_context(str(book.get("description") or ""))
    except Exception as e:
        _fail(public_id, str(e))
        raise

    chapters_plan = outline.get("chapters")
    if not isinstance(chapters_plan, list) or not chapters_plan:
        _fail(public_id, "outline has no chapters")
        return

    sync = merge_with_defaults(book.get("sync_state"))
    db_raw = fetch_internal_chapters(book_id)
    sorted_db = sorted(
        [c for c in db_raw if isinstance(c, dict)],
        key=lambda x: int(x.get("chapter_number", 0)),
    )
    desc = str(book.get("description") or "")
    try:
        _reconcile_summaries_from_db(sorted_db, sync, provider)
    except Exception as e:
        _fail(public_id, f"resume/summaries: {e}")
        raise

    _normalize_preview_chapter_title(public_id, sorted_db, chapters_plan)

    prev_excerpt: str | None = None
    if sorted_db:
        prev_excerpt = str(sorted_db[-1].get("content") or "")[-8000:] or None
        sync["previous_excerpt_tail"] = prev_excerpt or ""

    start_idx = len(sorted_db) + 1
    total = len(chapters_plan)

    # Full manuscript must include the user-facing preview: when there are no chapter rows yet,
    # reuse preview_text / description.preview_markdown as chapter 1 (verbatim), then continue.
    seed_preview = _preview_markdown_for_seeding(book, desc) if not sorted_db else None
    loop_start = start_idx
    try:
        if seed_preview and start_idx == 1 and total >= 1:
            ch0 = chapters_plan[0]
            if isinstance(ch0, dict):
                title0 = str(ch0.get("title", "Chapter 1"))[:255]
                post_ai_progress({"book_public_id": public_id, "status": "generating"})
                sync, prev_excerpt = _finalize_chapter_after_body(
                    book_id,
                    public_id,
                    1,
                    title0,
                    seed_preview,
                    sync,
                    spec,
                    provider,
                )
                loop_start = 2

        if loop_start > total:
            post_ai_callback({"book_public_id": public_id, "status": "complete", "chapters": []})
            return

        for idx in range(loop_start, total + 1):
            ch = chapters_plan[idx - 1]
            if not isinstance(ch, dict):
                continue
            title = str(ch.get("title", f"Chapter {idx}"))[:255]
            post_ai_progress({"book_public_id": public_id, "status": "generating"})
            body = run_chapter(
                spec,
                outline,
                idx,
                ch,
                sync,
                prev_excerpt,
                provider=provider,
            )
            sync, prev_excerpt = _finalize_chapter_after_body(
                book_id,
                public_id,
                idx,
                title,
                body,
                sync,
                spec,
                provider,
            )

        post_ai_callback({"book_public_id": public_id, "status": "complete", "chapters": []})
    except Exception as e:
        log.exception("full generation failed for book %s", book_id)
        try:
            post_ai_callback(
                {
                    "book_public_id": public_id,
                    "status": "failed",
                    "error": f"{e}\n{traceback.format_exc()}"[:4000],
                }
            )
        except Exception:
            log.exception("failed to report generation error to Go")
