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
        "character_arc": "",
        "character_bible": "",
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
            "character_arc",
            "character_bible",
            "previous_excerpt_tail",
        ) and isinstance(raw[k], str):
            base[k] = raw[k]
    return base
