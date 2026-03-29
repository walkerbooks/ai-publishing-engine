"""Intake agent: conversation → BSO extraction via structured LLM output."""

from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from api.agents.prompts.intake import build_intake_system
from api.llm.factory import get_llm
from api.services.bso_validator import validate_bso
from api.state.schema import IntakeResponse


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
) -> dict[str, Any]:
    """
    Run one intake turn: user message + history → reply and optional BSO.
    Returns dict with keys: content (str), book_spec (dict | None), intake_complete (bool).
    """
    llm = get_llm(provider)
    structured_llm = llm.with_structured_output(IntakeResponse)

    messages: list[BaseMessage] = [
        SystemMessage(content=build_intake_system(known_display_name)),
    ]
    messages.extend(_history_to_messages(history))
    messages.append(HumanMessage(content=message))

    response: IntakeResponse = structured_llm.invoke(messages)

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
    }
