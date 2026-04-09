"""
LangGraph pipeline: supervisor → intake | outline | preview → end.
Nodes delegate to existing agents. Use for tracing and future checkpointing.
"""

from langgraph.graph import END, StateGraph
from langgraph.checkpoint.memory import MemorySaver

from api.agents.graph_state import BookPipelineState
from api.agents.intake_agent import run_intake
from api.agents.outline_agent import run_outline
from api.agents.preview_agent import run_preview


def _supervisor_node(state: BookPipelineState) -> BookPipelineState:
    """Deterministic router: no state change, routing only."""
    return state


def _route_supervisor(state: BookPipelineState) -> str:
    """Route from supervisor to the node for current stage."""
    stage = (state.get("stage") or "intake").lower()
    if stage == "outline" and state.get("book_spec"):
        return "outline"
    if stage == "preview" and state.get("book_spec") and state.get("book_outline"):
        return "preview"
    if stage == "intake":
        return "intake"
    return "__end__"


def _intake_node(state: BookPipelineState) -> BookPipelineState:
    """Run intake agent; update state with reply and optional BSO."""
    message = state.get("message") or ""
    history = state.get("history") or []
    result = run_intake(message=message, history=history)
    return {
        "content": result["content"],
        "book_spec": result.get("book_spec"),
        "intake_complete": result.get("intake_complete", False),
    }


def _outline_node(state: BookPipelineState) -> BookPipelineState:
    """Run outline agent; update state with book_outline."""
    book_spec = state.get("book_spec") or {}
    outline, _spec_used = run_outline(book_spec=book_spec)
    return {"book_outline": outline}


def _preview_node(state: BookPipelineState) -> BookPipelineState:
    """Run preview agent; update state with preview_content."""
    book_spec = state.get("book_spec") or {}
    book_outline = state.get("book_outline") or {}
    content = run_preview(book_spec=book_spec, book_outline=book_outline)
    return {"preview_content": content}


def build_book_pipeline_graph():
    """Build and compile the pipeline graph. Uses MemorySaver for dev."""
    graph = StateGraph(BookPipelineState)

    graph.add_node("supervisor", _supervisor_node)
    graph.add_node("intake", _intake_node)
    graph.add_node("outline", _outline_node)
    graph.add_node("preview", _preview_node)

    graph.set_entry_point("supervisor")
    graph.add_conditional_edges(
        "supervisor",
        _route_supervisor,
        {"intake": "intake", "outline": "outline", "preview": "preview", "__end__": END},
    )
    graph.add_edge("intake", END)
    graph.add_edge("outline", END)
    graph.add_edge("preview", END)

    checkpointer = MemorySaver()
    return graph.compile(checkpointer=checkpointer)


# Single compiled instance for reuse
_compiled_graph = None


def get_book_pipeline_graph():
    """Return the compiled pipeline graph (singleton)."""
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_book_pipeline_graph()
    return _compiled_graph
