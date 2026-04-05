"""Public PDF download for full-book exports (written during internal generation)."""

from __future__ import annotations

import re
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from api.config import get_settings
from api.services.chapters_pdf import read_pdf_export_metadata

router = APIRouter(prefix="/api", tags=["exports"])

_FORBIDDEN_FILENAME = '<>:"/\\|?*' + "".join(chr(i) for i in range(32))


def _sanitize_filename_component(s: str, max_len: int) -> str:
    cleaned = "".join(c for c in s if c not in _FORBIDDEN_FILENAME)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if len(cleaned) > max_len:
        cleaned = cleaned[: max_len - 1].rstrip() + "..."
    return cleaned


def _download_pdf_filename(book_public_id: str, pdf_path: Path) -> str:
    meta = read_pdf_export_metadata(pdf_path)
    author = _sanitize_filename_component((meta or {}).get("author") or "", 80)
    title = _sanitize_filename_component((meta or {}).get("title") or "", 120)
    if author and title:
        base = f"{author} - {title}"
    elif title:
        base = title
    elif author:
        base = author
    else:
        base = f"book-{book_public_id.strip()}"
    if len(base) > 200:
        base = base[:197].rstrip() + "..."
    return f"{base}.pdf"


def _pdf_path(book_public_id: str) -> Path:
    bid = book_public_id.strip()
    if not bid or len(bid) > 80 or any(x in bid for x in ("/", "\\", "..")):
        raise HTTPException(status_code=400, detail="invalid book_public_id")
    root = Path(get_settings().pdf_export_storage_dir).resolve()
    return root / f"{bid}.pdf"


@router.get("/exports/pdf/{book_public_id}")
def download_full_book_pdf(book_public_id: str) -> FileResponse:
    """
    Serves the PDF generated at end of `run_full_generation`.
    URL is sent to Go via internal AI callback `export.file_url`.
    """
    path = _pdf_path(book_public_id)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="PDF not found or not generated yet")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=_download_pdf_filename(book_public_id, path),
        content_disposition_type="attachment",
    )
