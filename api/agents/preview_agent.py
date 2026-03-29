"""Preview agent: BSO + outline → 6–8 page markdown (intro + sample chapter)."""

import json

from langchain_core.messages import HumanMessage, SystemMessage

from api.agents.prompts import PREVIEW_SYSTEM
from api.llm.factory import get_llm


def run_preview(
    book_spec: dict,
    book_outline: dict,
    revision_notes: str | None = None,
    provider: str | None = None,
) -> str:
    """
    Generate a 6–8 page preview (intro + first chapter) as markdown.
    """
    llm = get_llm(provider)
    spec_text = json.dumps(book_spec, indent=2)
    outline_text = json.dumps(book_outline, indent=2)

    notes = (
        f"\n\nRevision instructions from the user:\n{revision_notes}\n"
        if revision_notes
        else ""
    )
    messages = [
        SystemMessage(content=PREVIEW_SYSTEM),
        HumanMessage(
            content=f"Book Specification:\n\n{spec_text}\n\n"
            f"Book Outline:\n\n{outline_text}\n\n"
            f"{notes}"
            "Write the 6–8 page preview in markdown (intro + full first chapter)."
        ),
    ]
    response = llm.invoke(messages)
    return response.content if hasattr(response, "content") else str(response)
