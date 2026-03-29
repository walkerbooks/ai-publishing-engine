"""Retry LLM calls when the provider returns rate-limit / 429 errors (common on Groq free tier)."""

from __future__ import annotations

import logging
import time
from typing import Callable, TypeVar

log = logging.getLogger(__name__)

T = TypeVar("T")


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
            err_s = str(e).lower()
            is_rl = (
                "rate limit" in err_s
                or "429" in err_s
                or type(e).__name__ in ("RateLimitError", "APIStatusError")
            )
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
