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
    openai_image_model: str = Field(
        default="gpt-image-1",
        validation_alias="OPENAI_IMAGE_MODEL",
    )

    # Groq (when llm_provider=groq)
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    # Cap intake history length to reduce tokens (Groq free tier has a low daily token limit).
    groq_max_history_messages: int = Field(default=24, validation_alias="GROQ_MAX_HISTORY_MESSAGES")

    # Planning: words per printed page when converting BSO target_length_pages → total_word_target
    # (trade paperbacks often use ~250–350; tune without code changes). Outline + chapter budgets use this.
    book_words_per_page: int = Field(
        default=280,
        ge=2,
        le=400,
        validation_alias="BOOK_WORDS_PER_PAGE",
    )

    # When set, intake infers this target_length_pages if the user omits length (must be 150–250).
    default_target_length_pages: int | None = Field(
        default=None,
        ge=150,
        le=250,
        validation_alias="DEFAULT_TARGET_LENGTH_PAGES",
    )

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

    # Directory where generated cover images are written.
    cover_image_storage_dir: str = Field(
        default=str(_REPO_ROOT / "var" / "cover_images"),
        validation_alias="COVER_IMAGE_STORAGE_DIR",
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

    # Run sync-state LLM updates every N chapters (and always on chapter 1/final).
    full_generation_sync_state_every_n_chapters: int = Field(
        default=2,
        ge=1,
        le=10,
        validation_alias="FULL_GENERATION_SYNC_STATE_EVERY_N_CHAPTERS",
    )

    # Trigger chapter expansion pass only when initial draft is below this ratio of target words.
    chapter_expand_floor_ratio: float = Field(
        default=0.80,
        ge=0.5,
        le=0.95,
        validation_alias="CHAPTER_EXPAND_FLOOR_RATIO",
    )

    # Skip expensive chapter expansion pass for longer books (page target at or above this).
    chapter_expand_max_pages: int = Field(
        default=250,
        ge=150,
        le=250,
        validation_alias="CHAPTER_EXPAND_MAX_PAGES",
    )

    quality_eval_enabled: bool = Field(
        default=True,
        validation_alias="QUALITY_EVAL_ENABLED",
    )
    quality_min_character_depth: int = Field(
        default=7,
        ge=1,
        le=10,
        validation_alias="QUALITY_MIN_CHARACTER_DEPTH",
    )
    quality_min_readability: int = Field(
        default=7,
        ge=1,
        le=10,
        validation_alias="QUALITY_MIN_READABILITY",
    )
    quality_min_engagement: int = Field(
        default=7,
        ge=1,
        le=10,
        validation_alias="QUALITY_MIN_ENGAGEMENT",
    )
    quality_min_pacing: int = Field(
        default=7,
        ge=1,
        le=10,
        validation_alias="QUALITY_MIN_PACING",
    )
    quality_min_conversational_voice: int = Field(
        default=7,
        ge=1,
        le=10,
        validation_alias="QUALITY_MIN_CONVERSATIONAL_VOICE",
    )
    quality_min_emotional_authenticity: int = Field(
        default=7,
        ge=1,
        le=10,
        validation_alias="QUALITY_MIN_EMOTIONAL_AUTHENTICITY",
    )
    quality_min_emotional_stakes: int = Field(
        default=7,
        ge=1,
        le=10,
        validation_alias="QUALITY_MIN_EMOTIONAL_STAKES",
    )
    quality_min_character_texture: int = Field(
        default=7,
        ge=1,
        le=10,
        validation_alias="QUALITY_MIN_CHARACTER_TEXTURE",
    )
    quality_min_repetition_penalty: int = Field(
        default=7,
        ge=1,
        le=10,
        validation_alias="QUALITY_MIN_REPETITION_PENALTY",
    )
    quality_min_generic_language: int = Field(
        default=7,
        ge=1,
        le=10,
        validation_alias="QUALITY_MIN_GENERIC_LANGUAGE",
    )
    quality_max_rewrite_passes: int = Field(
        default=2,
        ge=0,
        le=5,
        validation_alias="QUALITY_MAX_REWRITE_PASSES",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
