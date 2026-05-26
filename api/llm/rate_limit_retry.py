"""Retry LLM calls on rate limits and on recoverable structured-output / tool-call failures."""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Callable, TypeVar

log = logging.getLogger(__name__)

_MAX_REPAIR_HINT_CHARS = 6000


def _find_failed_generation_in_obj(obj: Any, depth: int = 0) -> str | None:
    """Recursively locate a string ``failed_generation`` in API error bodies (OpenAI, etc.)."""
    if depth > 10 or obj is None:
        return None
    if isinstance(obj, dict):
        raw = obj.get("failed_generation")
        if isinstance(raw, str) and raw.strip():
            return raw.strip()
        for v in obj.values():
            hit = _find_failed_generation_in_obj(v, depth + 1)
            if hit:
                return hit
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            hit = _find_failed_generation_in_obj(v, depth + 1)
            if hit:
                return hit
    return None


def extract_structured_output_repair_hint(exc: BaseException) -> str | None:
    """
    Best-effort extract provider diagnostics (e.g. OpenAI ``failed_generation``) so the next
    LLM turn can self-correct structured output / tool JSON.
    """
    for attr in ("body", "param", "response", "error"):
        val = getattr(exc, attr, None)
        if val is not None and hasattr(val, "json") and callable(val.json):
            try:
                val = val.json()
            except Exception:
                val = None
        if isinstance(val, dict):
            hit = _find_failed_generation_in_obj(val)
            if hit:
                return (
                    hit[:_MAX_REPAIR_HINT_CHARS] + "\n…(truncated)"
                    if len(hit) > _MAX_REPAIR_HINT_CHARS
                    else hit
                )
        elif isinstance(val, str):
            parsed: Any = None
            try:
                parsed = json.loads(val)
            except Exception:
                parsed = None
            if isinstance(parsed, dict):
                hit = _find_failed_generation_in_obj(parsed)
                if hit:
                    return (
                        hit[:_MAX_REPAIR_HINT_CHARS] + "\n…(truncated)"
                        if len(hit) > _MAX_REPAIR_HINT_CHARS
                        else hit
                    )
            if "failed_generation" in val:
                s = val.strip()
                return (
                    s[:_MAX_REPAIR_HINT_CHARS] + "\n…(truncated)"
                    if len(s) > _MAX_REPAIR_HINT_CHARS
                    else s
                )

    s = str(exc).strip()
    if not s:
        return None
    if len(s) > _MAX_REPAIR_HINT_CHARS:
        s = s[:_MAX_REPAIR_HINT_CHARS] + "\n…(truncated)"
    return s

T = TypeVar("T")


def _is_rate_limited(e: BaseException) -> bool:
    err_s = str(e).lower()
    return (
        "rate limit" in err_s
        or "429" in err_s
        or type(e).__name__ in ("RateLimitError", "APIStatusError")
    )


def _is_structured_output_recoverable(e: BaseException) -> bool:
    """Provider failed to parse tool / JSON args (e.g. OpenAI tool_use_failed)."""
    err_s = str(e).lower()
    if "tool_use_failed" in err_s:
        return True
    if "failed to call a function" in err_s:
        return True
    if "invalid_request_error" in err_s and "tool" in err_s:
        return True
    if "failed_generation" in err_s:
        return True
    # LangChain / provider wrappers
    if "invalidstructuredoutput" in err_s.replace(" ", "").replace("_", ""):
        return True
    return False


def invoke_with_rate_limit_retry(
    fn: Callable[[], T],
    *,
    max_attempts: int = 8,
    initial_delay_s: float = 1.0,
    max_delay_s: float = 60.0,
) -> T:
    delay = initial_delay_s
    last_exc: BaseException | None = None
    for attempt in range(max_attempts):
        try:
            return fn()
        except Exception as e:
            last_exc = e
            is_rl = _is_rate_limited(e)
            if not is_rl or attempt >= max_attempts - 1:
                raise
            log.warning(
                "llm rate limited (attempt %s/%s), sleeping %.1fs",
                attempt + 1,
                max_attempts,
                delay,
            )
            time.sleep(delay)
            delay = min(delay * 2, max_delay_s)
    assert last_exc is not None
    raise last_exc


def invoke_with_llm_retry(
    fn: Callable[[], T],
    *,
    max_attempts: int = 5,
    initial_delay_s: float = 0.6,
    max_delay_s: float = 20.0,
) -> T:
    """
    Retry on rate limits and on malformed structured tool output (transient model mistakes).
    Uses shorter backoff than rate-limit-only retry; both share the same attempt budget.
    """
    delay = initial_delay_s
    last_exc: BaseException | None = None
    for attempt in range(max_attempts):
        try:
            return fn()
        except Exception as e:
            last_exc = e
            is_rl = _is_rate_limited(e)
            is_tool = _is_structured_output_recoverable(e)
            recoverable = is_rl or is_tool
            if not recoverable or attempt >= max_attempts - 1:
                raise
            reason = "rate limited" if is_rl else "structured output / tool parse failed"
            log.warning(
                "llm %s (attempt %s/%s), sleeping %.1fs",
                reason,
                attempt + 1,
                max_attempts,
                delay,
            )
            time.sleep(delay)
            delay = min(delay * 2, max_delay_s)
    assert last_exc is not None
    raise last_exc
