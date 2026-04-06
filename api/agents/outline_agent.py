"""Outline agent: BSO → chapter plan (titles, subtopics, word budget)."""

import json

from langchain_core.messages import HumanMessage, SystemMessage

from api.agents.prompts import OUTLINE_SYSTEM
from api.config import get_settings
from api.llm.factory import get_llm
from api.state.schema import BookOutline


def _proportionally_scale_to_total(weights: list[int], total_words: int) -> list[int]:
    """
    Integer targets that sum to total_words, preserving relative weights.
    If all weights are zero, falls back to equal split (last resort).
    """
    n = len(weights)
    if n == 0:
        return []
    s = sum(weights)
    if s <= 0:
        base, rem = divmod(total_words, n)
        return [base + (1 if i < rem else 0) for i in range(n)]
    exact = [total_words * (w / s) for w in weights]
    floors = [int(x) for x in exact]
    remainder = total_words - sum(floors)
    order = sorted(range(n), key=lambda i: exact[i] - floors[i], reverse=True)
    for k in range(remainder):
        floors[order[k % n]] += 1
    return floors


def _align_outline_to_page_target(
    outline: dict,
    target_pages: int,
    words_per_page: int,
) -> dict:
    """
    Set estimated_pages and total_word_target from the BSO. Preserve the model’s *relative*
    chapter weights: scale per-chapter word_target so they sum to the book total exactly.
    """
    total_words = target_pages * words_per_page
    out = dict(outline)
    out["estimated_pages"] = target_pages
    out["total_word_target"] = total_words
    chapters = out.get("chapters")
    if not isinstance(chapters, list) or not chapters:
        return out

    new_chapters: list[dict] = []
    weights: list[int] = []
    for ch in chapters:
        c = dict(ch) if isinstance(ch, dict) else {}
        w = c.get("word_target")
        try:
            wi = max(0, int(w))
        except (TypeError, ValueError):
            wi = 0
        weights.append(wi)
        new_chapters.append(c)

    targets = _proportionally_scale_to_total(weights, total_words)

    for c, wt in zip(new_chapters, targets):
        c["word_target"] = wt
    out["chapters"] = new_chapters
    return out


def run_outline(
    book_spec: dict,
    revision_notes: str | None = None,
    provider: str | None = None,
) -> dict:
    """
    Generate a BookOutline from a Book Specification.
    Returns the outline as a dict (ready for JSON response and validation).
    """
    settings = get_settings()
    words_per_page = settings.book_words_per_page

    llm = get_llm(provider)
    structured_llm = llm.with_structured_output(BookOutline)
    spec_text = json.dumps(book_spec, indent=2)

    notes = f"\n\nRevision instructions from the user:\n{revision_notes}\n\n" if revision_notes else ""
    planning_block = (
        f"Planning: use **{words_per_page} words per printed page** when converting page length to words. "
        f"So **total_word_target = target_length_pages × {words_per_page}** (match this product exactly). "
        "Choose **word_target per chapter yourself** by arc, emphasis, and genre (longer chapters where the book needs depth, shorter for transitions) — "
        "not necessarily equal. Chapter **word_target** values must **sum to total_word_target** exactly.\n\n"
    )
    messages = [
        SystemMessage(content=OUTLINE_SYSTEM),
        HumanMessage(
            content=f"Book Specification (BSO):\n\n{spec_text}\n\n{planning_block}{notes}Produce the chapter outline."
        ),
    ]
    outline: BookOutline = structured_llm.invoke(messages)
    data = outline.model_dump()
    tp = book_spec.get("target_length_pages")
    if isinstance(tp, int) and 1 <= tp <= 200:
        data = _align_outline_to_page_target(data, tp, words_per_page)
        outline = BookOutline.model_validate(data)
    return outline.model_dump()
