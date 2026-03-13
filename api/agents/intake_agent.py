"""Intake agent: conversation → BSO extraction via structured LLM output."""

from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage

from api.agents.prompts import INTAKE_SYSTEM
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
) -> dict[str, Any]:
    """
    Run one intake turn: user message + history → reply and optional BSO.
    Returns dict with keys: content (str), book_spec (dict | None), intake_complete (bool).
    """
    llm = get_llm(provider)
    structured_llm = llm.with_structured_output(IntakeResponse)

    messages: list[BaseMessage] = [SystemMessage(content=INTAKE_SYSTEM)]
    messages.extend(_history_to_messages(history))
    messages.append(HumanMessage(content=message))

    response: IntakeResponse = structured_llm.invoke(messages)

    book_spec = None
    intake_complete = response.intake_complete

    if response.bso is not None:
        partial = response.bso.model_dump()
        # Only validate when we have all required fields (no nulls for required keys)
        if all(partial.get(k) is not None for k in ("genre", "audience", "tone", "target_length_pages")):
            valid, _ = validate_bso(partial)
            if valid:
                book_spec = partial
            else:
                intake_complete = False
        else:
            intake_complete = False

    return {
        "content": response.reply,
        "book_spec": book_spec,
        "intake_complete": intake_complete,
    }
