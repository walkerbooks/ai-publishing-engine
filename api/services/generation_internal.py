"""Internal generation jobs triggered by the Go worker (preview / full book).

After full generation, we build a combined-chapter PDF (``api.services.chapters_pdf``)
and a Word file (``api.services.chapters_docx``), write them under
``PDF_EXPORT_STORAGE_DIR``, and POST ``export`` to Go's internal AI callback with
``file_url`` pointing at ``GET /api/exports/pdf/{book_public_id}`` (prefix from
``PDF_EXPORT_PUBLIC_URL_PREFIX``). The DOCX is served at
``GET /api/exports/docx/{book_public_id}`` (same prefix). Set
``STUB_PDF_EXPORT_FAILED_AFTER_FULL_BOOK=true`` to skip PDF generation and mark the export
failed.

Go has no PDF worker: ``POST /v1/exports/request`` only inserts ``queued``. The same
``chapters_pdf`` / ``chapters_docx`` build runs on demand via ``POST /internal/build-export``
(book_id), which Go calls so the row moves to ``ready`` with a browser-openable URL (not S3).

Illustrated cover: ``fetch_book_by_internal_id`` should include ``cover_image_fetch_url``
(presigned R2 GET) when Go stores the cover in Cloudflare R2, or legacy ``cover_image_png``
(base64) when bytes remain on the book row; see ``api.services.illustrated_cover_bytes``.
Export logs distinguish “embedded N bytes” (wire OK) from “no illustrated cover bytes”.
"""

from __future__ import annotations

import json
import logging
import traceback
from pathlib import Path
from typing import Any

from api.agents.chapter_agent import run_chapter, summarize_chapter
from api.agents.preview_agent import (
    evaluate_chapter_quality,
    rewrite_chapter_with_quality_feedback,
    run_preview,
)
from api.agents.sync_state_agent import run_sync_state_update
from api.config import get_settings
from api.services.chapters_docx import build_manuscript_docx_bytes, write_docx_to_path
from api.services.chapters_pdf import (
    ManuscriptFrontMatter,
    build_manuscript_pdf_bytes,
    legacy_manuscript_front_matter,
    write_pdf_export_metadata,
    write_pdf_to_path,
)
from api.services.illustrated_cover_bytes import extract_illustrated_cover_bytes
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
    update_sync_state: bool = True,
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
    if update_sync_state:
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
        sync["character_arc"] = updated["character_arc"]
        sync["character_bible"] = updated["character_bible"]
        if "environmental_pressure" in updated:
            sync["environmental_pressure"] = updated["environmental_pressure"]
    sync["previous_excerpt_tail"] = excerpt_tail
    if update_sync_state:
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


def _quality_thresholds_from_settings() -> dict[str, int]:
    settings = get_settings()
    return {
        "character_depth_score": int(settings.quality_min_character_depth),
        "readability_score": int(settings.quality_min_readability),
        "engagement_score": int(settings.quality_min_engagement),
        "pacing_score": int(settings.quality_min_pacing),
        "conversational_voice_score": int(settings.quality_min_conversational_voice),
        "emotional_authenticity_score": int(settings.quality_min_emotional_authenticity),
        "emotional_stakes_score": int(settings.quality_min_emotional_stakes),
        "character_texture_score": int(settings.quality_min_character_texture),
        "repetition_penalty_score": int(settings.quality_min_repetition_penalty),
        "generic_language_score": int(settings.quality_min_generic_language),
    }


def _passes_quality_gate(scores: dict[str, Any], thresholds: dict[str, int]) -> bool:
    for key, floor in thresholds.items():
        try:
            if int(scores.get(key, 0)) < int(floor):
                return False
        except (TypeError, ValueError):
            return False
    return True


def _outline_dedication_from_book(book: dict[str, Any]) -> str | None:
    desc = str(book.get("description") or "").strip()
    if not desc:
        return None
    try:
        data = json.loads(desc)
        outline = data.get("book_outline")
        if isinstance(outline, dict):
            d = outline.get("dedication")
            if d is not None and str(d).strip():
                return str(d).strip()
    except (json.JSONDecodeError, TypeError, ValueError):
        pass
    return None


def _pdf_title_metadata_from_book(book: dict[str, Any], fallback_title: str) -> tuple[str, str | None, str | None]:
    """
    Prefer book_outline.book_title and subtitle from description JSON; optional author from book fields.
    """
    main = (fallback_title or "Manuscript").strip() or "Manuscript"
    subtitle: str | None = None
    author_name: str | None = None
    desc = str(book.get("description") or "").strip()
    if desc:
        try:
            data = json.loads(desc)
            outline = data.get("book_outline")
            if isinstance(outline, dict):
                bt = str(outline.get("book_title") or "").strip()
                if bt:
                    main = bt
                st = outline.get("subtitle")
                if st is not None and str(st).strip():
                    subtitle = str(st).strip()
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
    for key in ("Author", "author", "AuthorName", "author_name"):
        v = book.get(key)
        if v is not None and str(v).strip():
            author_name = str(v).strip()
            break
    return (main, subtitle, author_name)


def _manuscript_front_matter_for_book(book: dict[str, Any]) -> ManuscriptFrontMatter:
    """
    Reads optional ``front_matter`` from description JSON (set by the chat UI before pay/generate).
    When absent, returns legacy placeholder acknowledgment + about pages.
    """
    desc = str(book.get("description") or "").strip()
    _main, _sub, author_from_meta = _pdf_title_metadata_from_book(book, "")
    author_display = (author_from_meta or "").strip() or None
    try:
        data = json.loads(desc)
        fm = data.get("front_matter")
        if isinstance(fm, dict):
            ack_on = bool(fm.get("include_acknowledgement"))
            ack_txt = str(fm.get("acknowledgement_text") or "").strip()
            ab_on = bool(fm.get("include_about_author"))
            ab_txt = str(fm.get("about_author_text") or "").strip()
            ack_body: str | None = None
            if ack_on:
                ack_body = ack_txt if ack_txt else " "
            ab_body: str | None = None
            if ab_on:
                ab_body = ab_txt if ab_txt else (author_display or "The author")
            return ManuscriptFrontMatter(
                acknowledgement_body=ack_body,
                about_the_author_body=ab_body,
            )
    except (json.JSONDecodeError, TypeError, ValueError):
        pass
    return legacy_manuscript_front_matter(author_display)


def _complete_book_callback(book_id: int, public_id: str, book_title: str) -> None:
    """Tell Go the manuscript is done and attach a generated PDF URL (or export failed)."""
    settings = get_settings()
    body: dict[str, Any] = {
        "book_public_id": public_id,
        "status": "complete",
        "chapters": [],
    }

    if settings.stub_pdf_export_failed_after_full_book:
        body["export"] = {
            "format": "pdf",
            "status": "failed",
            "file_url": "",
        }
        post_ai_callback(body)
        return

    try:
        book = fetch_book_by_internal_id(book_id)
        chapters = fetch_internal_chapters(book_id)
        main_title, subtitle, author_name = _pdf_title_metadata_from_book(book, book_title)
        dedication = _outline_dedication_from_book(book)
        front_matter = _manuscript_front_matter_for_book(book)
        cover_bytes = extract_illustrated_cover_bytes(book)
        if cover_bytes:
            log.info(
                "Export %s: illustrated cover embedded (%d bytes)",
                public_id,
                len(cover_bytes),
            )
        else:
            log.info(
                "Export %s: no illustrated cover bytes from internal book payload "
                "(set cover on the book via chat with link_book_public_id, or ensure "
                "cover_image_fetch_url / cover_image_png from GET internal/books/{id})",
                public_id,
            )
        toc_lines: list[tuple[str, str]] = []
        pdf_bytes = build_manuscript_pdf_bytes(
            chapters,
            main_title,
            subtitle=subtitle,
            author_name=author_name,
            dedication=dedication,
            front_matter=front_matter,
            toc_lines_out=toc_lines,
            illustrated_cover_image=cover_bytes,
        )
        out = Path(settings.pdf_export_storage_dir) / f"{public_id}.pdf"
        write_pdf_to_path(out, pdf_bytes)
        write_pdf_export_metadata(out, author=author_name, title=main_title)
        try:
            docx_bytes = build_manuscript_docx_bytes(
                chapters,
                main_title,
                subtitle=subtitle,
                author_name=author_name,
                dedication=dedication,
                front_matter=front_matter,
                toc_lines=toc_lines,
                illustrated_cover_image=cover_bytes,
            )
            docx_out = Path(settings.pdf_export_storage_dir) / f"{public_id}.docx"
            write_docx_to_path(docx_out, docx_bytes)
            log.info(
                "Wrote DOCX for book %s (%d bytes) -> %s",
                public_id,
                len(docx_bytes),
                docx_out,
            )
        except Exception:
            log.exception("DOCX generation failed for book %s", public_id)
        prefix = settings.pdf_export_public_url_prefix.rstrip("/")
        file_url = f"{prefix}/exports/pdf/{public_id}"
        body["export"] = {
            "format": "pdf",
            "status": "ready",
            "file_url": file_url,
        }
        log.info("Wrote PDF for book %s (%d bytes) -> %s", public_id, len(pdf_bytes), out)
    except Exception:
        log.exception("PDF generation failed for book %s", public_id)
        body["export"] = {
            "format": "pdf",
            "status": "failed",
            "file_url": "",
        }

    post_ai_callback(body)


def run_manuscript_export_for_book(book_id: int) -> None:
    """
    Rebuild PDF + DOCX from chapters in Go and POST export status to Go.
    Used at end of full generation and when Go triggers ``POST /internal/build-export``.
    """
    book = fetch_book_by_internal_id(book_id)
    public_id = str(book["public_id"])
    book_title = str(book.get("Title") or book.get("title") or "Manuscript").strip() or "Manuscript"
    _complete_book_callback(book_id, public_id, book_title)


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
    book_title = str(book.get("Title") or book.get("title") or "Manuscript").strip() or "Manuscript"
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
    sync_every_n = max(1, int(settings.full_generation_sync_state_every_n_chapters))
    quality_enabled = bool(settings.quality_eval_enabled)
    quality_thresholds = _quality_thresholds_from_settings()
    max_rewrite_passes = int(settings.quality_max_rewrite_passes)

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
                    update_sync_state=True,
                )
                loop_start = 2

        if loop_start > total:
            _complete_book_callback(book_id, public_id, book_title)
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
            if quality_enabled:
                quality_eval = evaluate_chapter_quality(
                    spec,
                    outline,
                    idx,
                    title,
                    body,
                    provider=provider,
                )
                rewrite_count = 0
                while (
                    rewrite_count < max_rewrite_passes
                    and not _passes_quality_gate(quality_eval, quality_thresholds)
                ):
                    body = rewrite_chapter_with_quality_feedback(
                        spec,
                        outline,
                        idx,
                        title,
                        body,
                        quality_eval,
                        provider=provider,
                    )
                    rewrite_count += 1
                    quality_eval = evaluate_chapter_quality(
                        spec,
                        outline,
                        idx,
                        title,
                        body,
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
                update_sync_state=(idx == 1 or idx == total or idx % sync_every_n == 0),
            )

        _complete_book_callback(book_id, public_id, book_title)
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
