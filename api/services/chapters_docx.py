"""Build a Word document from stored chapter bodies (markdown → plain text + python-docx)."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.shared import Inches, Pt, RGBColor

from api.services.chapters_pdf import (
    _BODY_LINE_MULT,
    _BODY_PT,
    _CHAPTER_PT,
    _COVER_BY_PT,
    _COVER_MAIN_PT,
    _COVER_SUB_PT,
    _COVER_TEXT_RGB,
    _PARA_AFTER_PT,
    _TOC_HEADING_PT,
    _TOC_LINE_PT,
    _format_subtitle_line,
    _markdownish_to_plain,
    _split_paragraphs,
)

# Must match ``chapters_pdf`` / reference Word manuscript (see ``_register_*_fonts`` there).
_FONT_COVER = "Century Gothic"
_FONT_BODY = "Times New Roman"
_FONT_BY_LINE = "Verdana"
_FONT_AUTHOR = "Palatino Linotype"


def _set_trade_page_layout(doc: Document) -> None:
    for section in doc.sections:
        section.page_width = Inches(6)
        section.page_height = Inches(9)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)


def _set_body_style(doc: Document) -> None:
    normal = doc.styles["Normal"]
    normal.font.name = _FONT_BODY
    normal.font.size = Pt(_BODY_PT)


def build_manuscript_docx_bytes(
    chapters: list[dict[str, Any]],
    book_title: str,
    *,
    subtitle: str | None = None,
    author_name: str | None = None,
) -> bytes:
    """
    Concatenate chapters (sorted by chapter_number) into one .docx.
    Expects dicts with keys title, content (as returned by Go internal chapters API).

    Uses the same point sizes, margins, cover colour, markdown cleanup, and spacing rules
    as ``build_manuscript_pdf_bytes`` (6×9", 1" margins; Century Gothic / Verdana /
    Palatino on the cover; Times body; justified chapter text; TOC as plain lines).
    """
    sorted_rows = sorted(
        [c for c in chapters if isinstance(c, dict)],
        key=lambda x: int(x.get("chapter_number") or 0),
    )
    if not sorted_rows:
        raise ValueError("no chapters to render")

    doc = Document()
    _set_trade_page_layout(doc)
    _set_body_style(doc)

    cover_rgb = RGBColor(*_COVER_TEXT_RGB)

    main_title = (book_title or "Manuscript").strip()[:500] or "Manuscript"
    sub = (subtitle or "").strip()
    sub_line = _format_subtitle_line(sub) if sub else ""
    auth = (author_name or "").strip()[:300]

    # Cover: same vertical rhythm as ``build_manuscript_pdf_bytes`` (ln 28 / 8 / 18 / 4 pt).
    p_main = doc.add_paragraph()
    p_main.paragraph_format.space_before = Pt(28)
    p_main.paragraph_format.space_after = Pt(8)
    p_main.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_main = p_main.add_run(main_title)
    r_main.font.name = _FONT_COVER
    r_main.font.bold = True
    r_main.font.size = Pt(_COVER_MAIN_PT)
    r_main.font.color.rgb = cover_rgb

    if sub_line:
        p_sub = doc.add_paragraph()
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_sub.paragraph_format.space_after = Pt(18) if auth else Pt(0)
        r_sub = p_sub.add_run(sub_line)
        r_sub.font.name = _FONT_COVER
        r_sub.font.bold = True
        r_sub.font.size = Pt(_COVER_SUB_PT)
        r_sub.font.color.rgb = cover_rgb

    if auth:
        p_by = doc.add_paragraph()
        p_by.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_by = p_by.add_run("By")
        r_by.font.name = _FONT_BY_LINE
        r_by.font.bold = True
        r_by.font.size = Pt(_COVER_BY_PT)
        r_by.font.color.rgb = cover_rgb

        p_auth = doc.add_paragraph()
        p_auth.paragraph_format.space_before = Pt(4)
        p_auth.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_auth = p_auth.add_run(auth)
        r_auth.font.name = _FONT_AUTHOR
        r_auth.font.bold = True
        r_auth.font.size = Pt(_COVER_BY_PT)
        r_auth.font.color.rgb = cover_rgb

    doc.add_page_break()

    chapter_entries: list[tuple[str, str, str]] = []
    for row in sorted_rows:
        num = int(row.get("chapter_number") or 0)
        ch_title = str(row.get("title") or f"Chapter {num}").strip()[:500]
        body = _markdownish_to_plain(str(row.get("content") or ""))
        if not body and not ch_title:
            continue
        line = f"Chapter {num}: {ch_title}" if num else ch_title
        heading = f"Chapter {num}: {ch_title}" if num else ch_title
        chapter_entries.append((line, heading, body))

    # Table of Contents: centered heading, then left lines (no bullets), 11 pt — matches PDF.
    p_toc = doc.add_paragraph()
    p_toc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_toc.paragraph_format.space_after = Pt(10)
    r_toc = p_toc.add_run("Table of Contents")
    r_toc.font.name = _FONT_BODY
    r_toc.font.bold = True
    r_toc.font.size = Pt(_TOC_HEADING_PT)

    for line, _h, _b in chapter_entries:
        p_line = doc.add_paragraph(line)
        p_line.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p_line.paragraph_format.space_after = Pt(2)
        p_line.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
        p_line.paragraph_format.line_spacing = 1.2
        r_ln = p_line.runs[0]
        r_ln.font.name = _FONT_BODY
        r_ln.font.size = Pt(_TOC_LINE_PT)
        r_ln.font.bold = False

    doc.add_page_break()

    for i, (_line, heading, body) in enumerate(chapter_entries):
        p_h = doc.add_paragraph()
        p_h.alignment = WD_ALIGN_PARAGRAPH.CENTER
        has_body = bool(body and body.strip())
        # PDF: ln(6) after chapter heading; if no body, ln(8) still runs → 6 + 8 pt below title.
        p_h.paragraph_format.space_after = Pt(6 + 8) if not has_body else Pt(6)
        r_h = p_h.add_run(heading)
        r_h.font.name = _FONT_BODY
        r_h.font.bold = True
        r_h.font.size = Pt(_CHAPTER_PT)

        if has_body:
            paras = _split_paragraphs(body)
            for pi, para in enumerate(paras):
                bp = doc.add_paragraph()
                r = bp.add_run(para)
                r.font.name = _FONT_BODY
                r.font.size = Pt(_BODY_PT)
                bp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                bp.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
                bp.paragraph_format.line_spacing = _BODY_LINE_MULT
                is_last_para = pi == len(paras) - 1
                # PDF: ln(12 pt) after each body paragraph, then ln(8 pt) after the last in chapter.
                if is_last_para:
                    bp.paragraph_format.space_after = Pt(_PARA_AFTER_PT + 8)
                else:
                    bp.paragraph_format.space_after = Pt(_PARA_AFTER_PT)

        if i < len(chapter_entries) - 1:
            doc.add_page_break()

    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


def write_docx_to_path(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
