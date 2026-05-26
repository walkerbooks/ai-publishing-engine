"""Generate a single chapter and optional running summary for sync state."""

from __future__ import annotations

import json

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from api.agents.prompts.chapter import CHAPTER_SYSTEM, SUMMARY_SYSTEM
from api.config import get_settings
from api.llm.factory import get_llm
from api.llm.rate_limit_retry import invoke_with_rate_limit_retry
from api.llm.response_text import response_text


def _approx_word_count(text: str) -> int:
    t = text.strip()
    return len(t.split()) if t else 0


def _planned_chapters_lines(book_outline: dict) -> str:
    """Readable list for Table of Contents in chapter 1 / prompts."""
    chs = book_outline.get("chapters")
    if not isinstance(chs, list):
        return "(no chapters in outline)"
    lines: list[str] = []
    for c in chs:
        if not isinstance(c, dict):
            continue
        n = int(c.get("chapter_number") or 0)
        t = str(c.get("title") or "").strip()
        if not t:
            continue
        lines.append(f"{n}. {t}" if n else t)
    return "\n".join(lines) if lines else "(no chapters in outline)"


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
    # OpenAI models used here reject completion max_tokens above 16384.
    provider_max_completion_tokens = 16000
    wt = int(chapter_plan.get("word_target", 2000))
    # Allow long chapters without output truncation (provider caps may still apply).
    max_tokens = min(provider_max_completion_tokens, max(2048, int(wt * 2.5)))
    llm = get_llm(provider).bind(max_tokens=max_tokens)
    target_pages = book_spec.get("target_length_pages")
    if not isinstance(target_pages, int):
        target_pages = book_outline.get("estimated_pages")
    if not isinstance(target_pages, int):
        target_pages = 150
    spec = json.dumps(book_spec, indent=2)
    synopsis = _book_synopsis_paragraph(book_outline)
    plan = json.dumps(chapter_plan, indent=2)
    prior_summaries = (sync_state.get("chapter_summaries") or [])[-8:]
    summaries = "\n\n".join(prior_summaries) if prior_summaries else "(none yet)"
    continuity = json.dumps(
        {
            "narrative_arc": sync_state.get("narrative_arc", ""),
            "key_facts": sync_state.get("key_facts", []),
            "open_threads": sync_state.get("open_threads", []),
            "tone_anchors": sync_state.get("tone_anchors", ""),
            "last_chapter_beat": sync_state.get("last_chapter_beat", ""),
            "character_arc": sync_state.get("character_arc", ""),
            "character_bible": sync_state.get("character_bible", ""),
        },
        indent=2,
    )
    excerpt = (
        f"\n\nEnd of manuscript so far (exact tail of the last stored chapter; may follow intro-only or mixed preview content):\n{previous_chapter_excerpt[:4500]}\n"
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

    planned_toc = ""
    if chapter_index == 1 and not previous_chapter_excerpt:
        planned_toc = (
            "Planned chapters (full book — use this exact list for ## Table of Contents):\n"
            f"{_planned_chapters_lines(book_outline)}\n\n"
        )

    toc_guard = ""
    if not (chapter_index == 1 and not previous_chapter_excerpt):
        toc_guard = (
            "IMPORTANT — Table of contents: The book has exactly one manuscript-wide Table of Contents at the very beginning (chapter 1). "
            f"For this task (chapter {chapter_index}), do NOT output `## Table of Contents`, a numbered list of all book chapters, or any repeat of the full outline. "
            "Begin with only this chapter’s level-1 `#` heading and its body.\n\n"
        )

    length_contract = (
        f"WORD COUNT CONTRACT: This chapter’s outline word_target is **{wt}** words. "
        f"The book is planned for **{target_pages}** pages total (author specification) — each chapter must carry its share of that length. "
        f"Aim for roughly **{wt}** words (±10%).\n\n"
    )

    messages = [
        SystemMessage(content=CHAPTER_SYSTEM),
        HumanMessage(
            content=(
                f"{length_contract}"
                f"{toc_guard}"
                f"{continuity_note}"
                f"{planned_toc}"
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
    text = response_text(response).strip()
    wc = _approx_word_count(text)
    floor_ratio = get_settings().chapter_expand_floor_ratio
    floor = int(wt * floor_ratio)
    if wc < floor and wt >= 800 and text:
        llm_expand = get_llm(provider).bind(
            max_tokens=min(provider_max_completion_tokens, max(4096, int(wt * 3)))
        )
        messages2 = messages + [
            AIMessage(content=text),
            HumanMessage(
                content=(
                    f"The draft is only about {wc} words; this chapter must reach roughly {wt} words "
                    f"for the {target_pages}-page book contract. Expand with substantive material "
                    "(examples, scenes, argument, subsections) that fits the outline — no repetition padding. "
                    "Keep the same `#` chapter heading. Output the full revised chapter only."
                )
            ),
        ]
        response2 = invoke_with_rate_limit_retry(lambda: llm_expand.invoke(messages2))
        text2 = response_text(response2).strip()
        if _approx_word_count(text2) > wc:
            text = text2
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
    text = response_text(response)
    return text.strip()
