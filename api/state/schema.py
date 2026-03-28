"""Core state schemas — single source of truth for BSO and chat state."""

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Book specification (from intake)
# ---------------------------------------------------------------------------


class BookSpecification(BaseModel):
    """Structured book requirements (complete BSO). Used for validation and storage."""

    genre: str = Field(..., min_length=1, description="Primary genre")
    sub_genre: Optional[str] = Field(None, description="Optional sub-genre")
    audience: str = Field(..., min_length=1, description="Target audience")
    tone: str = Field(..., min_length=1, description="Tone, e.g. motivational, academic")
    target_length_pages: int = Field(..., ge=50, le=300, description="Target length in pages")
    format_type: Literal["kindle", "paperback", "hardback", "all"] = "all"
    page_size: Literal["6x9", "8.5x11", "8.25x11"] = "6x9"
    language: str = Field(default="English", min_length=1)
    title: Optional[str] = Field(None, description="Working title if provided")
    custom_instructions: Optional[str] = Field(None, description="Extra author instructions")


class IntakeBookSpecification(BaseModel):
    """
    Partial BSO for LLM structured output. All fields optional so the model
    can return null for missing info; Groq validates the tool payload strictly.
    """

    genre: Optional[str] = Field(None, description="Primary genre")
    sub_genre: Optional[str] = Field(None, description="Optional sub-genre")
    audience: Optional[str] = Field(None, description="Target audience")
    tone: Optional[str] = Field(None, description="Tone, e.g. motivational, academic")
    target_length_pages: Optional[int] = Field(None, ge=50, le=300, description="Target length in pages")
    # Kept as str (not strict Literal) so providers accept common synonyms; normalized below.
    format_type: Optional[str] = Field(
        None,
        description='kindle (ebook/digital), paperback, hardback, or all',
    )
    page_size: Optional[Literal["6x9", "8.5x11", "8.25x11"]] = None
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


class ChatMessage(BaseModel):
    """Single message in the intake conversation."""

    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1)


class IntakeResponse(BaseModel):
    """Structured LLM response for intake: reply + optional partial BSO + completion flag."""

    reply: str = Field(..., description="Assistant reply to show in chat")
    bso: Optional[IntakeBookSpecification] = Field(None, description="Extracted BSO (partial until complete)")
    intake_complete: bool = Field(False, description="True when BSO is ready to confirm")


# ---------------------------------------------------------------------------
# Outline (from outline agent)
# ---------------------------------------------------------------------------


class ChapterOutline(BaseModel):
    """One chapter in the book outline."""

    chapter_number: int = Field(..., ge=1)
    title: str = Field(..., min_length=1)
    subtopics: list[str] = Field(default_factory=list)
    word_target: int = Field(..., ge=500, le=8000)


class BookOutline(BaseModel):
    """Full book outline: title, chapters, word budget."""

    book_title: str = Field(..., min_length=1)
    subtitle: Optional[str] = None
    dedication: Optional[str] = None
    chapters: list[ChapterOutline] = Field(..., min_length=1)
    total_word_target: int = Field(..., ge=10000)
    estimated_pages: int = Field(..., ge=50, le=400)
