"""Intake agent: conversation → BSO extraction via structured LLM output."""

import logging
import time
from typing import Any

log = logging.getLogger(__name__)

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from api.config import get_settings
from api.agents.prompts.intake import build_intake_system
from api.llm.factory import get_llm
from api.llm.rate_limit_retry import (
    _is_rate_limited,
    _is_structured_output_recoverable,
    extract_structured_output_repair_hint,
)
from api.services.bso_validator import validate_bso
from api.state.schema import IntakeResponse

# Lower than default LLM temperature so structured tool arguments stay valid JSON and nested correctly.
INTAKE_STRUCTURED_TEMPERATURE = 0.1


def _history_to_messages(history: list[dict[str, str]]) -> list[BaseMessage]:
    """Convert list of {role, content} to LangChain messages."""
    out: list[BaseMessage] = []
    for m in history:
        role, content = m.get("role", "user"), m.get("content", "")
        if role == "user":
            out.append(HumanMessage(content=content))
        else:
            out.append(AIMessage(content=content))
    return out


def run_intake(
    message: str,
    history: list[dict[str, Any]],
    provider: str | None = None,
    known_display_name: str | None = None,
    collaborative: bool = False,
    default_target_pages: int | None = None,
) -> dict[str, Any]:
    """
    Run one intake turn: user message + history → reply and optional BSO.
    Returns dict with keys: content (str), book_spec (dict | None), intake_complete (bool).
    """
    llm = get_llm(provider, temperature=INTAKE_STRUCTURED_TEMPERATURE)
    structured_llm = llm.with_structured_output(IntakeResponse)

    pages = default_target_pages
    if pages is None:
        pages = get_settings().default_target_length_pages

    messages: list[BaseMessage] = [
        SystemMessage(content=build_intake_system(known_display_name, collaborative, pages)),
    ]
    messages.extend(_history_to_messages(history))
    messages.append(HumanMessage(content=message))

    repair_tail: list[BaseMessage] = []
    delay_s = 0.6
    max_attempts = 5
    max_delay_s = 20.0
    last_exc: BaseException | None = None
    response: IntakeResponse | None = None
    for attempt in range(max_attempts):
        batch = [*messages, *repair_tail]
        try:
            response = structured_llm.invoke(batch)
            break
        except Exception as e:
            last_exc = e
            is_rl = _is_rate_limited(e)
            is_tool = _is_structured_output_recoverable(e)
            recoverable = is_rl or is_tool
            if not recoverable or attempt >= max_attempts - 1:
                raise
            reason = "rate limited" if is_rl else "structured output / tool parse failed"
            log.warning(
                "intake llm %s (attempt %s/%s), sleeping %.1fs",
                reason,
                attempt + 1,
                max_attempts,
                delay_s,
            )
            if is_tool:
                hint = extract_structured_output_repair_hint(e)
                fix = (
                    "The API could not parse your last structured output as a valid IntakeResponse.\n"
                    "Respond again with ONE tool/structured object matching the schema exactly:\n"
                    "- No XML or <function=IntakeResponse> wrappers; no markdown fences.\n"
                    "- JSON-compatible strings only (double quotes); escape inner quotes.\n"
                    f"- target_length_pages must be an integer from 1 to 200 (use {pages} if the user "
                    "did not specify length — do not use a pamphlet length like 3 unless they asked).\n"
                )
                if hint:
                    fix += f"\nProvider diagnostic (correct and retry):\n{hint}\n"
                repair_tail.append(HumanMessage(content=fix))
            time.sleep(delay_s)
            delay_s = min(delay_s * 2, max_delay_s)

    if response is None:
        assert last_exc is not None
        raise last_exc

    book_spec = None
    intake_complete = response.intake_complete

    if response.bso is not None:
        partial = response.bso.model_dump()
        required = ("genre", "audience", "tone", "target_length_pages")
        if all(partial.get(k) is not None for k in required):
            # Fill defaults for optional fields so strict BookSpecification validates
            full = {**partial}
            full.setdefault("format_type", "all")
            full.setdefault("page_size", "6x9")
            full.setdefault("language", "English")
            valid, _ = validate_bso(full)
            if valid:
                book_spec = full
            else:
                intake_complete = False
        else:
            intake_complete = False

    return {
        "content": response.reply,
        "book_spec": book_spec,
        "intake_complete": intake_complete,
        "offer_collaborative_feedback": bool(response.offer_collaborative_feedback),
    }
