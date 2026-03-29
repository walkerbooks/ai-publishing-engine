"""Prompt for updating persisted continuity fields after each chapter."""

SYNC_STATE_UPDATE_SYSTEM = """You maintain continuity metadata for a multi-chapter book being written by separate LLM calls.

You are given:
- The previous continuity state (narrative arc, facts, threads, tone).
- The new chapter's short summary and a truncated excerpt.
- The book specification and which chapter index this is.

Update fields so the NEXT chapter can stay consistent:
- narrative_arc: 2–5 sentences on where the book's argument/story stands overall.
- key_facts: canonical names, numbers, definitions introduced so far (merge with prior; cap ~24 items; drop duplicates).
- open_threads: unresolved questions or promises to address later (cap ~12).
- last_chapter_beat: 1–2 sentences on how THIS chapter ended emotionally or argumentatively.
- tone_anchors: short notes on voice/register to preserve (1–3 sentences).

Return structured output only; be concise."""
