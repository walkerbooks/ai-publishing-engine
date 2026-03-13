"""Outline agent: BSO → chapter plan (titles, subtopics, word budget)."""

import json

from langchain_core.messages import HumanMessage, SystemMessage

from api.agents.prompts import OUTLINE_SYSTEM
from api.llm.factory import get_llm
from api.state.schema import BookOutline


def run_outline(book_spec: dict, provider: str | None = None) -> dict:
    """
    Generate a BookOutline from a Book Specification.
    Returns the outline as a dict (ready for JSON response and validation).
    """
    llm = get_llm(provider)
    structured_llm = llm.with_structured_output(BookOutline)
    spec_text = json.dumps(book_spec, indent=2)

    messages = [
        SystemMessage(content=OUTLINE_SYSTEM),
        HumanMessage(content=f"Book Specification (BSO):\n\n{spec_text}\n\nProduce the chapter outline."),
    ]
    outline: BookOutline = structured_llm.invoke(messages)
    return outline.model_dump()
