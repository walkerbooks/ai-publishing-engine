"""LLM step to refresh narrative_arc, character_arc, key_facts, open_threads, etc. after each chapter."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, ConfigDict, Field, field_validator

from api.agents.prompts.sync_state import SYNC_STATE_UPDATE_SYSTEM
from api.llm.factory import get_llm
from api.llm.rate_limit_retry import invoke_with_rate_limit_retry


def _to_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _to_str_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(x).strip() for x in value if str(x).strip()]
    t = _to_text(value)
    return [t] if t else []


def _maybe_json_object(value: Any) -> Any:
    """If the model returned a JSON object as a string, parse it."""
    if not isinstance(value, str):
        return value
    t = value.strip()
    if not t or t[0] not in "{[":
        return value
    try:
        return json.loads(t)
    except Exception:
        return value


class CharacterArcFields(BaseModel):
    """Structured protagonist trajectory used by chapter generation continuity."""

    model_config = ConfigDict(extra="ignore")

    current_mindset: str = ""
    moral_position: str = ""
    hardness_level: str = ""
    last_decision_made: str = ""
    current_belief: str = ""
    arc_delta: str = ""

    @classmethod
    def from_any(cls, value: Any) -> "CharacterArcFields":
        value = _maybe_json_object(value)
        if isinstance(value, cls):
            return value
        if isinstance(value, dict):
            return cls(
                current_mindset=_to_text(value.get("current_mindset")),
                moral_position=_to_text(value.get("moral_position")),
                hardness_level=_to_text(value.get("hardness_level")),
                last_decision_made=_to_text(value.get("last_decision_made")),
                current_belief=_to_text(value.get("current_belief")),
                arc_delta=_to_text(value.get("arc_delta")),
            )
        t = _to_text(value)
        return cls(current_mindset=t if t else "")


class EnvironmentalPressureFields(BaseModel):
    """Structured environmental pressure tracker required by sync-state prompt."""

    model_config = ConfigDict(extra="ignore")

    active_forces: list[str] = Field(default_factory=list)
    pressure_level: str = ""
    last_causal_moment: str = ""
    escalation_due: str = ""

    @classmethod
    def from_any(cls, value: Any) -> "EnvironmentalPressureFields":
        value = _maybe_json_object(value)
        if isinstance(value, cls):
            return value
        if isinstance(value, dict):
            return cls(
                active_forces=_to_str_list(value.get("active_forces")),
                pressure_level=_to_text(value.get("pressure_level")),
                last_causal_moment=_to_text(value.get("last_causal_moment")),
                escalation_due=_to_text(value.get("escalation_due")),
            )
        t = _to_text(value)
        return cls(pressure_level=t if t else "")


class SyncStateFields(BaseModel):
    """Structured LLM output merged into book sync_state after each chapter."""

    model_config = ConfigDict(extra="ignore")

    narrative_arc: str = ""
    key_facts: list[str] = Field(default_factory=list)
    open_threads: list[str] = Field(default_factory=list)
    last_chapter_beat: str = ""
    tone_anchors: str = ""
    character_arc: CharacterArcFields = Field(default_factory=CharacterArcFields)
    character_bible: str = ""
    environmental_pressure: EnvironmentalPressureFields = Field(
        default_factory=EnvironmentalPressureFields
    )

    @field_validator("character_arc", mode="before")
    @classmethod
    def _coerce_character_arc(cls, v: Any) -> CharacterArcFields:
        return CharacterArcFields.from_any(v)

    @field_validator("environmental_pressure", mode="before")
    @classmethod
    def _coerce_environmental_pressure(cls, v: Any) -> EnvironmentalPressureFields:
        return EnvironmentalPressureFields.from_any(v)

    @field_validator("character_bible", mode="before")
    @classmethod
    def _coerce_character_bible(cls, v: Any) -> str:
        if v is None:
            return ""
        if isinstance(v, str):
            return v.strip()
        if isinstance(v, dict):
            return json.dumps(v)
        return str(v).strip()


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
    character_arc, environmental_pressure — to merge into persisted sync_state
    (caller appends chapter_summaries and excerpt separately).
    """
    llm = get_llm(provider)
    structured = llm.with_structured_output(SyncStateFields, method="function_calling")
    payload = {
        "prior_state": {
            "narrative_arc": sync_state.get("narrative_arc", ""),
            "key_facts": sync_state.get("key_facts", []),
            "open_threads": sync_state.get("open_threads", []),
            "tone_anchors": sync_state.get("tone_anchors", ""),
            "character_arc": sync_state.get("character_arc", ""),
            "character_bible": sync_state.get("character_bible", ""),
            "environmental_pressure": sync_state.get("environmental_pressure", {}),
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
        "character_arc": out.character_arc.model_dump(),
        "character_bible": out.character_bible,
        "environmental_pressure": out.environmental_pressure.model_dump(),
    }
