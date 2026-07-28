"""Preview agent: BSO + outline → 6–8 page markdown (intro + sample chapter)."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, ConfigDict, Field, field_validator

from api.agents.prompts import PREVIEW_SYSTEM
from api.llm.factory import get_llm
from api.llm.rate_limit_retry import invoke_with_rate_limit_retry
from api.llm.response_text import response_text

log = logging.getLogger(__name__)


def _to_str_list(value: Any) -> list[str]:
    """Coerce LLM list-or-prose into list[str] (common function-calling drift)."""
    if value is None:
        return []
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    if isinstance(value, str):
        t = value.strip()
        if not t:
            return []
        lines = [ln.strip() for ln in re.split(r"[\n\r]+", t) if ln.strip()]
        if len(lines) > 1:
            cleaned: list[str] = []
            for ln in lines:
                cleaned.append(re.sub(r"^\d+[\.\)\-:\s]+", "", ln).strip() or ln)
            return [c for c in cleaned if c]
        return [t]
    return [str(value).strip()] if str(value).strip() else []


def _to_score(value: Any, default: int = 7) -> int:
    try:
        n = int(value)
    except Exception:
        return default
    return max(1, min(10, n))


class ChapterQualityEvaluation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    character_depth_score: int = Field(default=7, ge=1, le=10)
    readability_score: int = Field(default=7, ge=1, le=10)
    engagement_score: int = Field(default=7, ge=1, le=10)
    pacing_score: int = Field(default=7, ge=1, le=10)
    voice_consistency_score: int = Field(default=7, ge=1, le=10)
    conversational_voice_score: int = Field(default=7, ge=1, le=10)
    emotional_authenticity_score: int = Field(default=7, ge=1, le=10)
    emotional_stakes_score: int = Field(default=7, ge=1, le=10)
    character_texture_score: int = Field(default=7, ge=1, le=10)
    repetition_penalty_score: int = Field(default=7, ge=1, le=10)
    generic_language_score: int = Field(default=7, ge=1, le=10)
    overused_motif_terms: list[str] = Field(default_factory=list)
    repeated_phrases: list[str] = Field(default_factory=list)
    generic_phrases: list[str] = Field(default_factory=list)
    top_issues: list[str] = Field(default_factory=list)
    targeted_rewrite_instructions: list[str] = Field(default_factory=list)

    @field_validator(
        "character_depth_score",
        "readability_score",
        "engagement_score",
        "pacing_score",
        "voice_consistency_score",
        "conversational_voice_score",
        "emotional_authenticity_score",
        "emotional_stakes_score",
        "character_texture_score",
        "repetition_penalty_score",
        "generic_language_score",
        mode="before",
    )
    @classmethod
    def _coerce_scores(cls, v: Any) -> int:
        return _to_score(v)

    @field_validator(
        "overused_motif_terms",
        "repeated_phrases",
        "generic_phrases",
        "top_issues",
        "targeted_rewrite_instructions",
        mode="before",
    )
    @classmethod
    def _coerce_lists(cls, v: Any) -> list[str]:
        return _to_str_list(v)


def run_preview(
    book_spec: dict,
    book_outline: dict,
    revision_notes: str | None = None,
    provider: str | None = None,
) -> str:
    """
    Generate a 6–8 page preview (intro + first chapter) as markdown.
    """
    llm = get_llm(provider)
    spec_text = json.dumps(book_spec, indent=2)
    outline_text = json.dumps(book_outline, indent=2)

    notes = (
        f"\n\nRevision instructions from the user:\n{revision_notes}\n"
        if revision_notes
        else ""
    )
    messages = [
        SystemMessage(content=PREVIEW_SYSTEM),
        HumanMessage(
            content=f"Book Specification:\n\n{spec_text}\n\n"
            f"Book Outline:\n\n{outline_text}\n\n"
            f"{notes}"
            "Write the 6–8 page preview in markdown (intro + full first chapter)."
        ),
    ]
    response = invoke_with_rate_limit_retry(lambda: llm.invoke(messages))
    return response_text(response).strip()


def _quality_passthrough() -> dict[str, Any]:
    """Scores that pass the gate so generation continues if evaluation fails."""
    return ChapterQualityEvaluation().model_dump()


def evaluate_chapter_quality(
    book_spec: dict[str, Any],
    book_outline: dict[str, Any],
    chapter_index: int,
    chapter_title: str,
    chapter_markdown: str,
    provider: str | None = None,
) -> dict[str, Any]:
    try:
        llm = get_llm(provider)
        structured = llm.with_structured_output(
            ChapterQualityEvaluation, method="function_calling"
        )
        payload = {
            "book_spec": book_spec,
            "book_outline": book_outline,
            "chapter_index": chapter_index,
            "chapter_title": chapter_title,
            "chapter_markdown": chapter_markdown[:18000],
        }
        messages = [
            SystemMessage(
                content=(
                    "You evaluate one book chapter for production quality.\n"
                    "Score from 1-10 for: character depth, readability, engagement, pacing, voice consistency, conversational voice, emotional authenticity, emotional stakes, character texture, repetition penalty, generic language.\n"
                    "Use strict standards. Low scores are allowed.\n"
                    "Identify repeated wording motifs, generic AI-style phrasing, and over-engineered consultant voice.\n"
                    "Penalize chapters that sound over-controlled, over-polished, or emotionally safe.\n"
                    "Penalize chapters that repeat framework terms instead of advancing scene-level reality.\n"
                    "Return concrete top_issues and targeted_rewrite_instructions as JSON arrays of short strings (not a single paragraph).\n"
                    "Focus on specificity, scene momentum, character movement, emotional messiness, and human-readable prose."
                )
            ),
            HumanMessage(content=json.dumps(payload, indent=2)),
        ]
        out: ChapterQualityEvaluation = invoke_with_rate_limit_retry(
            lambda: structured.invoke(messages)
        )
        if isinstance(out, dict):
            out = ChapterQualityEvaluation.model_validate(out)
        return out.model_dump()
    except Exception:
        log.exception(
            "chapter quality eval failed chapter=%s title=%r; skipping rewrite gate",
            chapter_index,
            chapter_title,
        )
        return _quality_passthrough()


def rewrite_chapter_with_quality_feedback(
    book_spec: dict[str, Any],
    book_outline: dict[str, Any],
    chapter_index: int,
    chapter_title: str,
    chapter_markdown: str,
    quality_feedback: dict[str, Any],
    provider: str | None = None,
) -> str:
    llm = get_llm(provider)
    messages = [
        SystemMessage(
            content=(
                "You revise a chapter using quality feedback.\n"
                "Preserve existing canon and core events.\n"
                "Do not rewrite the chapter into a different story.\n"
                "Improve only where needed to address the feedback.\n"
                "Force natural human dialogue and anti-consultant voice.\n"
                "Remove corporate strategy phrasing from character speech and close narration.\n"
                "Increase emotional realism: include doubt, friction, imperfect decisions, and lived consequences.\n"
                "Reduce repeated motif terms and replace them with concrete moments, numbers, and consequences.\n"
                "Output full revised chapter markdown only."
            )
        ),
        HumanMessage(
            content=(
                f"Book specification:\n{json.dumps(book_spec, indent=2)}\n\n"
                f"Book outline:\n{json.dumps(book_outline, indent=2)}\n\n"
                f"Chapter index: {chapter_index}\n"
                f"Chapter title: {chapter_title}\n\n"
                f"Quality feedback:\n{json.dumps(quality_feedback, indent=2)}\n\n"
                f"Current chapter markdown:\n{chapter_markdown}\n"
            )
        ),
    ]
    response = invoke_with_rate_limit_retry(lambda: llm.invoke(messages))
    return response_text(response).strip()
