"""Generate a single chapter and optional running summary for sync state."""

from __future__ import annotations

import json

from langchain_core.messages import HumanMessage, SystemMessage

from api.agents.prompts.chapter import CHAPTER_SYSTEM, SUMMARY_SYSTEM
from api.llm.factory import get_llm
from api.llm.rate_limit_retry import invoke_with_rate_limit_retry


def _book_synopsis_paragraph(book_outline: dict) -> str:
    """One paragraph from outline metadata only (saves TPM vs dumping full outline JSON)."""
    title = str(book_outline.get("book_title") or "Untitled").strip()
    subtitle = book_outline.get("subtitle")
    if subtitle and str(subtitle).strip():
        title_part = f'"{title}" ({str(subtitle).strip()})'
    else:
        title_part = f'"{title}"'
    chapters = book_outline.get("chapters")
    n_ch = len(chapters) if isinstance(chapters, list) else 0
    tw = book_outline.get("total_word_target")
    ep = book_outline.get("estimated_pages")
    parts: list[str] = []
    if n_ch:
        parts.append(f"{title_part} is planned as a {n_ch}-chapter book")
    else:
        parts.append(f"{title_part}")
    if tw is not None:
        try:
            parts.append(f"with a total word target of about {int(tw):,}")
        except (TypeError, ValueError):
            parts.append(f"with a total word target of about {tw}")
    if ep is not None:
        try:
            parts.append(f"and roughly {int(ep)} estimated pages")
        except (TypeError, ValueError):
            parts.append(f"and roughly {ep} estimated pages")
    parts.append(
        "Cross-chapter arc and prior content are carried in the continuity and rolling summaries below."
    )
    return " ".join(parts) + "."


def run_chapter(
    book_spec: dict,
    book_outline: dict,
    chapter_index: int,
    chapter_plan: dict,
    sync_state: dict,
    previous_chapter_excerpt: str | None,
    provider: str | None = None,
) -> str:
    """Returns markdown for one chapter. Uses persisted `sync_state` for continuity."""
    wt = int(chapter_plan.get("word_target", 2000))
    max_tokens = min(16000, max(1024, int(wt * 1.5)))
    llm = get_llm(provider).bind(max_tokens=max_tokens)
    spec = json.dumps(book_spec, indent=2)
    synopsis = _book_synopsis_paragraph(book_outline)
    plan = json.dumps(chapter_plan, indent=2)
    prior_summaries = sync_state.get("chapter_summaries") or []
    summaries = "\n\n".join(prior_summaries) if prior_summaries else "(none yet)"
    continuity = json.dumps(
        {
            "narrative_arc": sync_state.get("narrative_arc", ""),
            "key_facts": sync_state.get("key_facts", []),
            "open_threads": sync_state.get("open_threads", []),
            "tone_anchors": sync_state.get("tone_anchors", ""),
            "last_chapter_beat": sync_state.get("last_chapter_beat", ""),
        },
        indent=2,
    )
    excerpt = (
        f"\n\nEnd of manuscript so far (exact tail of the last stored chapter; may follow intro-only or mixed preview content):\n{previous_chapter_excerpt[:6000]}\n"
        if previous_chapter_excerpt
        else ""
    )
    continuity_note = ""
    if chapter_index > 1 and previous_chapter_excerpt:
        continuity_note = (
            f"Continuity lock: Everything through chapter {chapter_index - 1} is already fixed "
            f"(including any reader-facing preview material — intro, sample, or partial — stored with it). "
            f"Continue exactly after the excerpt above — same voice, facts, and story — no recap or contradiction.\n\n"
        )
    messages = [
        SystemMessage(content=CHAPTER_SYSTEM),
        HumanMessage(
            content=(
                f"{continuity_note}"
                f"Book specification:\n{spec}\n\n"
                f"Book synopsis (from outline metadata; whole-book positioning):\n{synopsis}\n\n"
                f"This chapter’s outline entry (structure for chapter {chapter_index} only):\n{plan}\n\n"
                f"Persisted continuity (from database; authoritative):\n{continuity}\n\n"
                f"Rolling chapter summaries (newest last):\n{summaries}\n"
                f"{excerpt}\n"
                f"Write chapter {chapter_index} in Markdown following the specification, "
                f"this chapter’s outline entry, and the continuity blocks above.\n"
            )
        ),
    ]
    response = invoke_with_rate_limit_retry(lambda: llm.invoke(messages))
    text = response.content if hasattr(response, "content") else str(response)
    return text.strip()


def summarize_chapter(chapter_markdown: str, provider: str | None = None) -> str:
    llm = get_llm(provider)
    messages = [
        SystemMessage(content=SUMMARY_SYSTEM),
        HumanMessage(
            content=f"Chapter text:\n\n{chapter_markdown[:12000]}",
        ),
    ]
    response = invoke_with_rate_limit_retry(lambda: llm.invoke(messages))
    text = response.content if hasattr(response, "content") else str(response)
    return text.strip()
