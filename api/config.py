"""Application config via environment. Uses pydantic-settings."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Load from env / .env. All keys optional with defaults where sensible."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # LLM provider: "openai" | "groq" (extend as needed)
    llm_provider: Literal["openai", "groq"] = "openai"

    # OpenAI (when llm_provider=openai)
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    # Groq (when llm_provider=groq)
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"

    # Optional: backend URL for future book persistence
    backend_url: str | None = None

    # LangSmith tracing (set LANGSMITH_API_KEY to enable)
    langchain_tracing_v2: str = "false"
    langsmith_api_key: str | None = None
    langsmith_project: str = "ebook-engine"
    langchain_endpoint: str = "https://api.smith.langchain.com"


@lru_cache
def get_settings() -> Settings:
    return Settings()
