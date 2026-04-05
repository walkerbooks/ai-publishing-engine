"""LLM step to refresh narrative_arc, character_arc, key_facts, open_threads, etc. after each chapter."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from api.agents.prompts.sync_state import SYNC_STATE_UPDATE_SYSTEM
from api.llm.factory import get_llm
from api.llm.rate_limit_retry import invoke_with_rate_limit_retry


def _character_arc_to_str(value: Any) -> str:
    """Persist character_arc as plain text; models often return a dict despite a string schema."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        lines: list[str] = []
        for k, v in value.items():
            if v is None:
                continue
            s = str(v).strip()
            if not s:
                continue
            label = str(k).replace("_", " ").strip()
            lines.append(f"{label}: {s}")
        return "\n".join(lines)
    if isinstance(value, list):
        return "\n".join(str(x).strip() for x in value if str(x).strip())
    return str(value).strip()


class SyncStateFields(BaseModel):
    narrative_arc: str = ""
    key_facts: list[str] = Field(default_factory=list)
    open_threads: list[str] = Field(default_factory=list)
    last_chapter_beat: str = ""
    tone_anchors: str = ""
    # Groq/tooling may emit a structured object; accept both so validation matches the model.
    character_arc: str | dict[str, Any] = ""


def run_sync_state_update(
    sync_state: dict[str, Any],
    chapter_index: int,
    chapter_title: str,
    chapter_summary: str,
    chapter_excerpt_tail: str,
    book_spec: dict[str, Any],
    provider: str | None = None,
) -> dict[str, Any]:
    """
    Returns dict with keys narrative_arc, key_facts, open_threads, last_chapter_beat, tone_anchors,
    character_arc — to merge into persisted sync_state (caller appends chapter_summaries and excerpt separately).
    """
    llm = get_llm(provider)
    structured = llm.with_structured_output(SyncStateFields)
    payload = {
        "prior_state": {
            "narrative_arc": sync_state.get("narrative_arc", ""),
            "key_facts": sync_state.get("key_facts", []),
            "open_threads": sync_state.get("open_threads", []),
            "tone_anchors": sync_state.get("tone_anchors", ""),
            "character_arc": sync_state.get("character_arc", ""),
        },
        "chapter_index": chapter_index,
        "chapter_title": chapter_title,
        "chapter_summary": chapter_summary,
        "chapter_excerpt_tail": chapter_excerpt_tail[:4000],
        "book_spec": book_spec,
    }
    messages = [
        SystemMessage(content=SYNC_STATE_UPDATE_SYSTEM),
        HumanMessage(content=json.dumps(payload, indent=2)),
    ]
    out: SyncStateFields = invoke_with_rate_limit_retry(lambda: structured.invoke(messages))
    return {
        "narrative_arc": out.narrative_arc,
        "key_facts": out.key_facts[:24],
        "open_threads": out.open_threads[:12],
        "last_chapter_beat": out.last_chapter_beat,
        "tone_anchors": out.tone_anchors,
        "character_arc": _character_arc_to_str(out.character_arc),
    }
