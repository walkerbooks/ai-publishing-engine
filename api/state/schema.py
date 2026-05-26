"""Core state schemas — single source of truth for BSO and chat state."""

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


def _normalize_page_size_to_literal(value: object) -> str | None:
    """Map ISO / casual trim names to allowed sizes; None = omit / use default later."""
    if value is None:
        return None
    if not isinstance(value, str):
        return None
    s = value.strip().lower().replace("×", "x").replace(" ", "")
    allowed = frozenset({"6x9", "8.5x11", "8.25x11"})
    if s in allowed:
        return s
    synonyms: dict[str, str] = {
        "a5": "6x9",
        "iso_a5": "6x9",
        "a5size": "6x9",
        "a4": "8.25x11",
        "iso_a4": "8.25x11",
        "letter": "8.5x11",
        "usletter": "8.5x11",
        "us_letter": "8.5x11",
        "8.5x11in": "8.5x11",
        "6x9in": "6x9",
        "trade": "6x9",
    }
    if s in synonyms:
        return synonyms[s]
    s2 = s.replace("_", "")
    if s2 in synonyms:
        return synonyms[s2]
    if "trade" in s and "paperback" in s.replace("_", ""):
        return "6x9"
    return None


# ---------------------------------------------------------------------------
# Book specification (from intake)
# ---------------------------------------------------------------------------


class BookSpecification(BaseModel):
    """Structured book requirements (complete BSO). Used for validation and storage."""

    genre: str = Field(..., min_length=1, description="Primary genre")
    sub_genre: Optional[str] = Field(None, description="Optional sub-genre")
    audience: str = Field(..., min_length=1, description="Target audience")
    tone: str = Field(..., min_length=1, description="Tone, e.g. motivational, academic")
    target_length_pages: int = Field(..., ge=1, le=200, description="Target length in pages")
    format_type: Literal["kindle", "paperback", "hardback", "all"] = "all"
    page_size: Literal["6x9", "8.5x11", "8.25x11"] = "6x9"
    language: str = Field(default="English", min_length=1)
    title: Optional[str] = Field(None, description="Working title if provided")
    custom_instructions: Optional[str] = Field(None, description="Extra author instructions")

    @field_validator("page_size", mode="before")
    @classmethod
    def normalize_book_spec_page_size(cls, value: object) -> str:
        """Coerce A5, letter, etc. to allowed literals; default 6x9."""
        return _normalize_page_size_to_literal(value) or "6x9"


class IntakeBookSpecification(BaseModel):
    """
    Partial BSO for LLM structured output. All fields optional so the model
    can return null for missing info; structured-output providers validate payloads strictly.
    """

    genre: Optional[str] = Field(None, description="Primary genre")
    sub_genre: Optional[str] = Field(None, description="Optional sub-genre")
    audience: Optional[str] = Field(None, description="Target audience")
    tone: Optional[str] = Field(None, description="Tone, e.g. motivational, academic")
    target_length_pages: Optional[int] = Field(None, ge=1, le=200, description="Target length in pages")
    # Kept as str (not strict Literal) so providers accept common synonyms; normalized below.
    format_type: Optional[str] = Field(
        None,
        description='kindle (ebook/digital), paperback, hardback, or all',
    )
    # Kept as str (not enum in tool schema) so providers accept "A5", "letter", etc.; normalized below.
    page_size: Optional[str] = Field(
        None,
        description='Trim: one of 6x9, 8.5x11, 8.25x11 (use 6x9 for A5/ebook typical)',
    )
    language: Optional[str] = Field(default="English", description="Language")
    title: Optional[str] = Field(None, description="Working title if provided")
    custom_instructions: Optional[str] = Field(None, description="Extra author instructions")

    @field_validator("format_type", mode="before")
    @classmethod
    def normalize_format_type(cls, value: object) -> str | None:
        """Map ebook/digital synonyms to kindle; unknown values → all (safe default)."""
        if value is None:
            return None
        if not isinstance(value, str):
            return None
        s = value.strip().lower().replace("-", "_").replace(" ", "_")
        synonyms: dict[str, str] = {
            "ebook": "kindle",
            "e_book": "kindle",
            "digital": "kindle",
            "epub": "kindle",
            "kdp": "kindle",
            "hardcover": "hardback",
            "hard_cover": "hardback",
            "paper_back": "paperback",
        }
        if s in synonyms:
            return synonyms[s]
        if s in ("kindle", "paperback", "hardback", "all"):
            return s
        return None

    @field_validator("page_size", mode="before")
    @classmethod
    def normalize_page_size(cls, value: object) -> str | None:
        """Map ISO / casual names to allowed trim sizes; unknown → None (defaults applied later)."""
        return _normalize_page_size_to_literal(value)


class ChatMessage(BaseModel):
    """Single message in the intake conversation."""

    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1)


class IntakeResponse(BaseModel):
    """Structured LLM response for intake: reply + optional partial BSO + completion flag."""

    reply: str = Field(..., description="Assistant reply to show in chat")
    bso: Optional[IntakeBookSpecification] = Field(None, description="Extracted BSO (partial until complete)")
    intake_complete: bool = Field(False, description="True when BSO is ready to confirm")
    offer_collaborative_feedback: bool = Field(
        False,
        description=(
            "Collaborative-build sessions only: set True when the reply is a checkpoint the user can "
            "approve or revise (Sounds good / change). Set False when the user must type their next "
            "answer (e.g. you asked a direct question)."
        ),
    )


# ---------------------------------------------------------------------------
# Outline (from outline agent)
# ---------------------------------------------------------------------------


class ChapterOutline(BaseModel):
    """One chapter in the book outline."""

    chapter_number: int = Field(..., ge=1)
    title: str = Field(..., min_length=1)
    subtopics: list[str] = Field(default_factory=list)
    word_target: int = Field(
        ...,
        ge=1,
        le=60000,
        description="Chapter word budget; must sum to total_word_target (per-chapter allocation is planner-chosen, then scaled to the book total)",
    )


class BookOutline(BaseModel):
    """Full book outline: title, chapters, word budget."""

    book_title: str = Field(..., min_length=1)
    subtitle: Optional[str] = None
    dedication: Optional[str] = None
    chapters: list[ChapterOutline] = Field(..., min_length=1)
    total_word_target: int = Field(..., ge=1)
    estimated_pages: int = Field(..., ge=1, le=200)
