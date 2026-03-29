"""Application config via environment. Uses pydantic-settings."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root (parent of `api/`) so .env loads regardless of uvicorn cwd.
_REPO_ROOT = Path(__file__).resolve().parents[1]
_ENV_FILE = _REPO_ROOT / ".env"


class Settings(BaseSettings):
    """Load from env / .env. All keys optional with defaults where sensible."""

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.is_file() else ".env",
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

    # Go API (for internal generation jobs calling back to persist chapters)
    backend_url: str | None = Field(default=None, validation_alias="BACKEND_URL")

    # Must match Go INTERNAL_API_KEY: verifies /internal/generate and authorizes callbacks to Go
    internal_api_key: str | None = Field(default=None, validation_alias="INTERNAL_API_KEY")

    # YouTube Data API v3 (for onboarding video block) — set YOUTUBE_API_KEY in .env
    youtube_api_key: str | None = Field(
        default=None,
        validation_alias="YOUTUBE_API_KEY",
    )

    # LangSmith tracing (set LANGSMITH_API_KEY to enable)
    langchain_tracing_v2: str = "false"
    langsmith_api_key: str | None = None
    langsmith_project: str = "ebook-engine"
    langchain_endpoint: str = "https://api.smith.langchain.com"


@lru_cache
def get_settings() -> Settings:
    return Settings()
