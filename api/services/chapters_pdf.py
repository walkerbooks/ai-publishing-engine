"""Build a simple PDF from stored chapter bodies (markdown → plain text + fpdf2)."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

# Optional: copy DejaVuSans.ttf from https://github.com/dejavu-fonts/dejavu-fonts (ttf/) here.
# Avoids Windows Fonts\arial.ttf etc.: fontTools can hit 'charmap' decode errors on those files.
_BUNDLED_DEJAVU = (
    Path(__file__).resolve().parent.parent / "data" / "fonts" / "DejaVuSans.ttf"
)


def _latin1_safe(text: str) -> str:
    """Helvetica / core fonts only support Latin-1 in fpdf2."""
    return text.encode("latin-1", errors="replace").decode("latin-1")


def _markdownish_to_plain(text: str) -> str:
    """Light cleanup so PDF text is readable (not full CommonMark)."""
    t = text.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"^#+\s+", "", t, flags=re.MULTILINE)
    t = re.sub(r"\*\*([^*]+)\*\*", r"\1", t)
    t = re.sub(r"__([^_]+)__", r"\1", t)
    t = re.sub(r"\*([^*]+)\*", r"\1", t)
    t = re.sub(r"`([^`]+)`", r"\1", t)
    t = re.sub(r"^\s*[-*+]\s+", "• ", t, flags=re.MULTILINE)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def _unicode_ttf_path() -> Path | None:
    """
    TTF that fpdf2/fontTools can load reliably.
    Do not use typical Windows Fonts\\*.ttf paths: many trigger 'charmap' decode errors
    when parsing the name table (e.g. arial.ttf on en-US Windows).
    """
    try:
        if _BUNDLED_DEJAVU.is_file():
            return _BUNDLED_DEJAVU
    except OSError:
        pass
    candidates = [
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/TTF/DejaVuSans.ttf"),
        Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
        Path("/Library/Fonts/Arial Unicode.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
    ]
    for p in candidates:
        try:
            if p.is_file():
                return p
        except OSError:
            continue
    return None


def build_manuscript_pdf_bytes(
    chapters: list[dict[str, Any]],
    book_title: str,
) -> bytes:
    """
    Concatenate chapters (sorted by chapter_number) into one PDF.
    Expects dicts with keys title, content (as returned by Go internal chapters API).
    """
    from fpdf import FPDF

    sorted_rows = sorted(
        [c for c in chapters if isinstance(c, dict)],
        key=lambda x: int(x.get("chapter_number") or 0),
    )
    if not sorted_rows:
        raise ValueError("no chapters to render")

    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    font_path = _unicode_ttf_path()
    family = "Helvetica"
    use_unicode_ttf = False
    if font_path is not None:
        try:
            pdf.add_font("BookBody", "", str(font_path))
            family = "BookBody"
            use_unicode_ttf = True
        except Exception as e:
            log.warning("Could not load unicode font %s: %s", font_path, e)
            family = "Helvetica"
            use_unicode_ttf = False

    def txt(s: str) -> str:
        return s if use_unicode_ttf else _latin1_safe(s)

    pdf.add_page()
    pdf.set_font(family, size=18)
    title = txt((book_title or "Manuscript").strip()[:200])
    pdf.multi_cell(0, 10, title)
    pdf.ln(4)
    pdf.set_font(family, size=11)

    for row in sorted_rows:
        num = int(row.get("chapter_number") or 0)
        ch_title = txt(str(row.get("title") or f"Chapter {num}").strip()[:500])
        body = txt(_markdownish_to_plain(str(row.get("content") or "")))
        if not body and not ch_title:
            continue
        # Custom TTF fonts often have no built-in bold face in fpdf2 — use size only.
        pdf.set_font(family, size=13)
        pdf.multi_cell(0, 8, f"Chapter {num}: {ch_title}" if num else ch_title)
        pdf.ln(2)
        pdf.set_font(family, size=11)
        if body:
            pdf.multi_cell(0, 6, body)
        pdf.ln(6)

    out = pdf.output(dest="S")
    if isinstance(out, str):
        return out.encode("latin-1", errors="replace")
    return bytes(out)


def write_pdf_to_path(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
