"""Public PDF download for full-book exports (written during internal generation)."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from api.config import get_settings

router = APIRouter(prefix="/api", tags=["exports"])


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
        filename=f"book-{book_public_id}.pdf",
        content_disposition_type="attachment",
    )
