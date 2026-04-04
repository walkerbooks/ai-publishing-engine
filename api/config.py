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
    # Cap intake history length to reduce tokens (Groq free tier has a low daily token limit).
    groq_max_history_messages: int = Field(default=24, validation_alias="GROQ_MAX_HISTORY_MESSAGES")

    # Go API (for internal generation jobs calling back to persist chapters)
    backend_url: str | None = Field(default=None, validation_alias="BACKEND_URL")

    # Must match Go INTERNAL_API_KEY: verifies /internal/generate and authorizes callbacks to Go
    internal_api_key: str | None = Field(default=None, validation_alias="INTERNAL_API_KEY")

    # Go does not run a PDF worker; export rows advance only via internal AI callback `export`.
    # When true, skip fpdf generation and POST export failed (dev escape hatch).
    stub_pdf_export_failed_after_full_book: bool = Field(
        default=False,
        validation_alias="STUB_PDF_EXPORT_FAILED_AFTER_FULL_BOOK",
    )

    # Directory where full-book PDFs are written (default under repo `var/pdf_exports`).
    pdf_export_storage_dir: str = Field(
        default=str(_REPO_ROOT / "var" / "pdf_exports"),
        validation_alias="PDF_EXPORT_STORAGE_DIR",
    )

    # Browser-openable prefix before `/exports/pdf/{book_public_id}`.
    # Examples: `http://127.0.0.1:8000/api` (direct AI API) or `http://localhost:3000/api/ai` (Next proxy).
    pdf_export_public_url_prefix: str = Field(
        default="http://127.0.0.1:8000/api",
        validation_alias="PDF_EXPORT_PUBLIC_URL_PREFIX",
    )

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
