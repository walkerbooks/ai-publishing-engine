"""
LangSmith tracing setup. Call once at app startup so all LangChain/LangGraph
calls are traced. Set LANGSMITH_API_KEY in env to enable.
"""

import os
import uuid

from api.config import get_settings


def init_langsmith() -> None:
    """
    Configure LangSmith via env vars so LangChain/LangGraph automatically
    send traces. No-op if langsmith_api_key is not set.
    """
    settings = get_settings()
    if not settings.langsmith_api_key:
        return
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project
    if getattr(settings, "langchain_endpoint", None):
        os.environ["LANGCHAIN_ENDPOINT"] = settings.langchain_endpoint


def graph_config(run_name: str, thread_id: str | None = None, **tags: str) -> dict:
    """
    Build config for graph.invoke(): run_name/tags for LangSmith,
    configurable.thread_id for the checkpointer (required by LangGraph when using a checkpointer).
    """
    tag_list = [f"{k}:{v}" for k, v in tags.items() if v is not None]
    config = {"run_name": run_name, "tags": tag_list}
    config["configurable"] = {"thread_id": thread_id or str(uuid.uuid4())}
    return config
