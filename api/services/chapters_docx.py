"""Build a Word document from stored chapter bodies (markdown → plain text + python-docx)."""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any

from docx import Document
from docx.enum.text import (
    WD_ALIGN_PARAGRAPH,
    WD_LINE_SPACING,
    WD_TAB_ALIGNMENT,
    WD_TAB_LEADER,
)
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
    format_manuscript_chapter_heading,
    _markdownish_to_plain,
    _split_paragraphs,
    strip_leading_chapter_heading_from_markdown,
)

# Content width 6" − 1" − 1" — right tab for dot leaders (TOC page numbers).
_TOC_TAB_POS = Inches(4)

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
    dedication: str | None = None,
    toc_lines: list[tuple[str, str]] | None = None,
) -> bytes:
    """
    Concatenate chapters (sorted by chapter_number) into one .docx.
    Expects dicts with keys title, content (as returned by Go internal chapters API).

    Uses the same point sizes, margins, cover colour, markdown cleanup, and spacing rules
    as ``build_manuscript_pdf_bytes`` (6×9", 1" margins; Century Gothic / Verdana /
    Palatino on the cover; Times body; justified chapter text).

    **TOC:** Pass ``toc_lines`` from ``build_manuscript_pdf_bytes(..., toc_lines_out=…)`` so
    Word matches the PDF (uppercase labels, dot leaders, Roman front matter + Arabic chapters).
    If ``toc_lines`` is omitted, a PDF is built once to obtain the same line list (slower).
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
        raw_title = str(row.get("title") or f"Chapter {num}").strip()[:500]
        raw_content = strip_leading_chapter_heading_from_markdown(
            str(row.get("content") or ""), num
        )
        body = _markdownish_to_plain(raw_content)
        if not body and not raw_title.strip():
            continue
        heading = format_manuscript_chapter_heading(num, raw_title)
        chapter_entries.append((heading, heading, body))

    toc: list[tuple[str, str]] = list(toc_lines) if toc_lines else []
    if not toc:
        from api.services.chapters_pdf import build_manuscript_pdf_bytes

        build_manuscript_pdf_bytes(
            sorted_rows,
            main_title,
            subtitle=sub if sub else None,
            author_name=auth if auth else None,
            dedication=dedication,
            toc_lines_out=toc,
        )

    # Table of Contents: centered **TABLE OF CONTENTS**, Times; dot leaders + page numbers.
    p_toc = doc.add_paragraph()
    p_toc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_toc.paragraph_format.space_after = Pt(10)
    r_toc = p_toc.add_run("TABLE OF CONTENTS")
    r_toc.font.name = _FONT_BODY
    r_toc.font.bold = True
    r_toc.font.size = Pt(_TOC_HEADING_PT)

    for label, page_str in toc:
        p_line = doc.add_paragraph()
        p_line.paragraph_format.space_after = Pt(2)
        p_line.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
        p_line.paragraph_format.line_spacing = 1.2
        p_line.paragraph_format.tab_stops.add_tab_stop(
            _TOC_TAB_POS, WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS
        )
        r_line = p_line.add_run(f"{label}\t{page_str}")
        r_line.font.name = _FONT_BODY
        r_line.font.size = Pt(_TOC_LINE_PT)
        r_line.font.bold = False

    doc.add_page_break()

    ded = (dedication or "").strip()
    p_dd = doc.add_paragraph()
    p_dd.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_dd.paragraph_format.space_after = Pt(6)
    r_dd = p_dd.add_run("DEDICATION")
    r_dd.font.name = _FONT_BODY
    r_dd.font.bold = True
    r_dd.font.size = Pt(_CHAPTER_PT)
    for para in _split_paragraphs(ded) if ded else [" "]:
        bp = doc.add_paragraph()
        r = bp.add_run(para)
        r.font.name = _FONT_BODY
        r.font.size = Pt(_BODY_PT)
        bp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        bp.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
        bp.paragraph_format.line_spacing = _BODY_LINE_MULT
        bp.paragraph_format.space_after = Pt(_PARA_AFTER_PT)

    doc.add_page_break()

    p_ack = doc.add_paragraph()
    p_ack.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ack.paragraph_format.space_after = Pt(6)
    r_ack = p_ack.add_run("ACKNOWLEDGMENT")
    r_ack.font.name = _FONT_BODY
    r_ack.font.bold = True
    r_ack.font.size = Pt(_CHAPTER_PT)
    p_ack_b = doc.add_paragraph()
    r_ab = p_ack_b.add_run(
        "The author wishes to thank everyone who supported the creation of this book."
    )
    r_ab.font.name = _FONT_BODY
    r_ab.font.size = Pt(_BODY_PT)
    p_ack_b.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_ack_b.paragraph_format.space_after = Pt(_PARA_AFTER_PT)

    doc.add_page_break()

    p_abt = doc.add_paragraph()
    p_abt.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_abt.paragraph_format.space_after = Pt(6)
    r_abt = p_abt.add_run("ABOUT THE AUTHOR")
    r_abt.font.name = _FONT_BODY
    r_abt.font.bold = True
    r_abt.font.size = Pt(_CHAPTER_PT)
    about_parts = []
    if auth:
        about_parts.append(auth)
    about_parts.append(
        "This author writes with the goal of connecting with readers through honest, vivid storytelling."
    )
    for para in _split_paragraphs("\n\n".join(about_parts)):
        bp = doc.add_paragraph()
        r = bp.add_run(para)
        r.font.name = _FONT_BODY
        r.font.size = Pt(_BODY_PT)
        bp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        bp.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
        bp.paragraph_format.line_spacing = _BODY_LINE_MULT
        bp.paragraph_format.space_after = Pt(_PARA_AFTER_PT)

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
