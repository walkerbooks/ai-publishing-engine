"""Persisted book continuity state (stored in Go `books.sync_state` JSONB)."""

from __future__ import annotations

from typing import Any


def default_sync_state() -> dict[str, Any]:
    return {
        "version": 1,
        "chapter_summaries": [],
        "narrative_arc": "",
        "key_facts": [],
        "open_threads": [],
        "last_chapter_beat": "",
        "tone_anchors": "",
        "character_arc": {
            "current_mindset": "",
            "moral_position": "",
            "hardness_level": "",
            "last_decision_made": "",
            "current_belief": "",
            "arc_delta": "",
        },
        "environmental_pressure": {
            "active_forces": [],
            "pressure_level": "",
            "last_causal_moment": "",
            "escalation_due": "",
        },
        "previous_excerpt_tail": "",
    }


def merge_with_defaults(raw: Any) -> dict[str, Any]:
    base = default_sync_state()
    if not isinstance(raw, dict):
        return base
    for k, v in base.items():
        if k not in raw:
            continue
        if k == "chapter_summaries" and isinstance(raw[k], list):
            base[k] = [str(x) for x in raw[k] if isinstance(x, str)]
        elif k in ("key_facts", "open_threads") and isinstance(raw[k], list):
            base[k] = [str(x) for x in raw[k]]
        elif k in (
            "narrative_arc",
            "last_chapter_beat",
            "tone_anchors",
            "previous_excerpt_tail",
        ) and isinstance(raw[k], str):
            base[k] = raw[k]
        elif k == "character_arc":
            rv = raw[k]
            if isinstance(rv, dict):
                base[k] = {
                    "current_mindset": str(rv.get("current_mindset") or ""),
                    "moral_position": str(rv.get("moral_position") or ""),
                    "hardness_level": str(rv.get("hardness_level") or ""),
                    "last_decision_made": str(rv.get("last_decision_made") or ""),
                    "current_belief": str(rv.get("current_belief") or ""),
                    "arc_delta": str(rv.get("arc_delta") or ""),
                }
            elif isinstance(rv, str):
                # Backward compatibility with old string-only schema.
                base[k] = {
                    "current_mindset": rv,
                    "moral_position": "",
                    "hardness_level": "",
                    "last_decision_made": "",
                    "current_belief": "",
                    "arc_delta": "",
                }
        elif k == "environmental_pressure" and isinstance(raw[k], dict):
            ep = raw[k]
            af = ep.get("active_forces")
            base[k] = {
                "active_forces": [str(x) for x in af] if isinstance(af, list) else [],
                "pressure_level": str(ep.get("pressure_level") or ""),
                "last_causal_moment": str(ep.get("last_causal_moment") or ""),
                "escalation_due": str(ep.get("escalation_due") or ""),
            }
    return base
