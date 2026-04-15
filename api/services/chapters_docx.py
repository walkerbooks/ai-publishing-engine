"""Build a Word document from stored chapter bodies (markdown → plain text + python-docx).

Layout:
  - 6×9 trade paperback, margins: top 1.03" / left+right 0.75" / bottom 0.19"
  - Cover: title 36 pt bold centred; By / author 24 pt bold centred at bottom of page
    (By = second-to-last line, author = last)
  - Copyright page: 12 pt centred (© line + all rights reserved)
  - Acknowledgment / About the Author: section title 16 pt bold centred; body 11 pt
  - TOC: after About the Author (and optional Dedication); heading 16 pt; entries 11 pt
    with dot leader at 4"; Chapter 1 begins on the following page
  - Chapters: "Chapter N" on first line, title on second line (both 16 pt bold centred);
    body 11 pt justified with indents and 1.15× line spacing
"""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any

from docx import Document
from docx.enum.text import (
    WD_ALIGN_PARAGRAPH,
    WD_BREAK,
    WD_LINE_SPACING,
    WD_TAB_ALIGNMENT,
    WD_TAB_LEADER,
)
from docx.shared import Inches, Pt, RGBColor, Twips

from api.services.chapters_pdf import (
    _COVER_TEXT_RGB,
    _format_subtitle_line,
    _markdownish_to_plain,
    _smart_double_quotes,
    _split_paragraphs,
    _strip_leading_chapter_prefix,
    strip_leading_chapter_heading_from_markdown,
)

# ---------------------------------------------------------------------------
# Typography constants — matched to the reference .docx (analysed from XML)
# ---------------------------------------------------------------------------

_FONT_COVER   = "Times New Roman"           # cover main title  (was Century Gothic)
_FONT_BY_LINE = "Times New Roman"          # "By" line
_FONT_AUTHOR  = "Times New Roman"
_FONT_BODY    = "Times New Roman"  # body, headings, TOC

# Sizes (pt)
_COVER_MAIN_PT  = 36.0
_COVER_SUB_PT   = 20.0   # subtitle below main title
_COVER_BY_PT    = 24.0   # "By" and author name
_COPYRIGHT_PT   = 12.0
_CHAPTER_PT     = 16.0
_TOC_HEADING_PT = 16.0
_TOC_LINE_PT    = 11.0
_BODY_PT        = 11.0

# Spacing — converted from DXA/twips found in reference XML
_BODY_LINE_MULT    = 1.15   # 276/240 auto line-spacing
_BODY_BEFORE_PT    = 25.7   # 514 twips ÷ 20  (Normal paragraphs)
_PARA_AFTER_PT     = 8.0    # 160 twips ÷ 20
_CHAPTER_BEFORE_PT = 4.8    # 69 twips  ÷ 20  (Heading1 space-before)
_CHAPTER_AFTER_PT  = 8.0    # 160 twips ÷ 20  (Heading1 space-after)

# Body-text side indents (416 / 414 DXA ≈ 0.289")
_BODY_INDENT_INCHES = 416 / 1440

# TOC right-tab position (content width = 6" − 0.75" − 0.75" = 4.5"; tab at 4")
_TOC_TAB_POS = Inches(4)


# ---------------------------------------------------------------------------
# Page layout
# ---------------------------------------------------------------------------

def _set_trade_page_layout(doc: Document) -> None:
    """6×9 trade paperback with margins matching the reference manuscript."""
    for section in doc.sections:
        section.page_width   = Inches(6)
        section.page_height  = Inches(9)
        # Reference margins (DXA → inches: value / 1440)
        section.top_margin    = Twips(1480)   # ≈ 1.03"
        section.left_margin   = Twips(1080)   # 0.75"
        section.right_margin  = Twips(1080)   # 0.75"
        section.bottom_margin = Twips(280)    # ≈ 0.19"  (matches reference)
        section.header_distance = Twips(720)  # 0.50"
        section.footer_distance = Twips(720)  # 0.50"


def _cover_space_before_by_pt(
    doc: Document,
    main_title: str,
    *,
    subtitle_line: str,
) -> float:
    """
    Space before the 'By' paragraph so 'By' and the author sit on the last two
    lines of the cover body area (By second-to-last, author last).

    Uses conservative wrap counts for 6×9 body width (~4.5"). If ``used`` is
    underestimated, ``space_before`` is too large and Word moves the By line
    to the next page.
    """
    sec = doc.sections[0]
    usable = float(
        sec.page_height.pt - sec.top_margin.pt - sec.bottom_margin.pt
    )

    # ~4.5" printable @ 36 pt bold → ~20–24 chars/line (40 is far too optimistic)
    chars_per_main_line = 22
    # Subtitle 20 pt → slightly more chars per line
    chars_per_sub_line = 36

    # Height used by title block from top of body
    used = 28.0  # cover title space_before
    n_main = max(1, (len(main_title) + chars_per_main_line - 1) // chars_per_main_line)
    used += n_main * (_COVER_MAIN_PT * 1.2)

    sub = (subtitle_line or "").strip()
    if sub:
        n_sub = max(1, (len(sub) + chars_per_sub_line - 1) // chars_per_sub_line)
        used += 6.0 + n_sub * (_COVER_SUB_PT * 1.15)

    # Style / rounding fudge so we do not exceed remaining space on page 1
    used += 16.0

    # Two lines at 24 pt + gap between By and author + bottom breathing room
    reserve_for_by_author = _COVER_BY_PT * 2.4 + 4.0 + 8.0

    gap = usable - used - reserve_for_by_author
    return max(12.0, gap)


def _set_body_style(doc: Document) -> None:
    """Override Normal with Times New Roman 11 pt."""
    normal = doc.styles["Normal"]
    normal.font.name = _FONT_BODY
    normal.font.size = Pt(_BODY_PT)


# ---------------------------------------------------------------------------
# Paragraph helpers
# ---------------------------------------------------------------------------

def _add_body_paragraph(doc: Document, text: str, is_last_in_chapter: bool = False) -> None:
    """
    Add one body paragraph: Times NR 11 pt, justified, 0.29" side indents,
    1.15× line spacing, 25.7 pt before, 8 pt after (16 pt after last para).
    """
    bp = doc.add_paragraph()
    r = bp.add_run(text)
    r.font.name = _FONT_BODY
    r.font.size = Pt(_BODY_PT)
    bp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    fmt = bp.paragraph_format
    fmt.left_indent  = Inches(_BODY_INDENT_INCHES)
    fmt.right_indent = Inches(_BODY_INDENT_INCHES)
    fmt.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    fmt.line_spacing      = _BODY_LINE_MULT
    fmt.space_before      = Pt(_BODY_BEFORE_PT)
    # PDF: 8 pt after each para, extra 8 pt after last → 16 pt after last
    fmt.space_after = Pt(_PARA_AFTER_PT + 8) if is_last_in_chapter else Pt(_PARA_AFTER_PT)


def _add_two_line_chapter_heading(
    doc: Document, chapter_num: int, raw_title: str
) -> None:
    """Line 1: Chapter N; line 2: title. Both 16 pt bold centred."""
    line1 = f"Chapter {chapter_num}"
    line2 = _strip_leading_chapter_prefix(raw_title, chapter_num)
    if line2.strip().upper() == f"CHAPTER {chapter_num}":
        line2 = (raw_title or "").strip() or "Untitled"

    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    f1 = p1.paragraph_format
    f1.space_before = Pt(_CHAPTER_BEFORE_PT)
    f1.space_after = Pt(4)
    r1 = p1.add_run(line1)
    r1.font.name = _FONT_BODY
    r1.font.bold = True
    r1.font.size = Pt(_CHAPTER_PT)

    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    f2 = p2.paragraph_format
    f2.space_before = Pt(0)
    f2.space_after = Pt(_CHAPTER_AFTER_PT)
    r2 = p2.add_run(line2)
    r2.font.name = _FONT_BODY
    r2.font.bold = True
    r2.font.size = Pt(_CHAPTER_PT)


def _add_copyright_page(doc: Document, author_name: str | None) -> None:
    """Copyright © 2025 by … and All rights reserved, 12 pt centred."""
    name = (author_name or "").strip() or "Umer Naeem"
    lines = (f"Copyright © 2025 by {name}", "All rights reserved")
    for i, text in enumerate(lines):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(text)
        r.font.name = _FONT_BODY
        r.font.size = Pt(_COPYRIGHT_PT)
        r.font.bold = False
        if i == len(lines) - 1:
            # Page break on this paragraph — avoids an extra empty para (blank page in Word)
            p.add_run().add_break(WD_BREAK.PAGE)


# ---------------------------------------------------------------------------
# Main builder
# ---------------------------------------------------------------------------

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

    Front order: cover → copyright → acknowledgment → about the author →
    optional dedication → table of contents → chapters.

    Parameters
    ----------
    toc_lines:
        List of (label, page_number_str) from ``build_manuscript_pdf_bytes``.
        When omitted the PDF builder is called once to derive the same list.
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
    sub        = (subtitle or "").strip()
    sub_line   = _format_subtitle_line(sub) if sub else ""
    auth       = (author_name or "").strip()[:300]

    # ------------------------------------------------------------------
    # Cover page — title top; By / author bottom (By = second-to-last line)
    # ------------------------------------------------------------------
    p_main = doc.add_paragraph()
    p_main.paragraph_format.space_before = Pt(28)
    p_main.paragraph_format.space_after = Pt(0) if auth else Pt(8)
    p_main.paragraph_format.keep_together = True
    p_main.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_main = p_main.add_run(main_title)
    r_main.font.name = _FONT_COVER
    r_main.font.bold = True
    r_main.font.size = Pt(_COVER_MAIN_PT)
    r_main.font.color.rgb = cover_rgb

    if sub_line:
        p_sub = doc.add_paragraph()
        p_sub.paragraph_format.space_before = Pt(0)
        p_sub.paragraph_format.space_after = Pt(0)
        p_sub.paragraph_format.keep_together = True
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_sub = p_sub.add_run(sub_line)
        r_sub.font.name = _FONT_COVER
        r_sub.font.bold = True
        r_sub.font.size = Pt(_COVER_SUB_PT)
        r_sub.font.color.rgb = cover_rgb

    if auth:
        p_by = doc.add_paragraph()
        p_by.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_by.paragraph_format.space_before = Pt(
            _cover_space_before_by_pt(doc, main_title, subtitle_line=sub_line)
        )
        p_by.paragraph_format.space_after = Pt(0)
        p_by.paragraph_format.keep_with_next = True
        p_by.paragraph_format.keep_together = True
        r_by = p_by.add_run("By")
        r_by.font.name = _FONT_BY_LINE
        r_by.font.bold = True
        r_by.font.size = Pt(_COVER_BY_PT)
        r_by.font.color.rgb = cover_rgb

        p_auth = doc.add_paragraph()
        p_auth.paragraph_format.space_before = Pt(4)
        p_auth.paragraph_format.space_after = Pt(0)
        p_auth.paragraph_format.keep_together = True
        p_auth.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_auth = p_auth.add_run(auth)
        r_auth.font.name = _FONT_AUTHOR
        r_auth.font.bold = True
        r_auth.font.size = Pt(_COVER_BY_PT)
        r_auth.font.color.rgb = cover_rgb
        p_auth.add_run().add_break(WD_BREAK.PAGE)
    elif sub_line:
        p_sub.add_run().add_break(WD_BREAK.PAGE)
    else:
        p_main.add_run().add_break(WD_BREAK.PAGE)

    # ------------------------------------------------------------------
    # Copyright
    # ------------------------------------------------------------------
    _add_copyright_page(doc, auth or None)

    # ------------------------------------------------------------------
    # Pre-process chapters + TOC lines (needed before TOC page)
    # ------------------------------------------------------------------
    chapter_entries: list[tuple[int, str, str]] = []
    for row in sorted_rows:
        num = int(row.get("chapter_number") or 0)
        raw_title = str(row.get("title") or f"Chapter {num}").strip()[:500]
        raw_body = strip_leading_chapter_heading_from_markdown(
            str(row.get("content") or ""), num
        )
        body = _smart_double_quotes(_markdownish_to_plain(raw_body))
        if body.strip() or raw_title.strip():
            chapter_entries.append((num, raw_title, body))

    toc: list[tuple[str, str]] = list(toc_lines) if toc_lines else []
    if not toc:
        from api.services.chapters_pdf import build_manuscript_pdf_bytes

        build_manuscript_pdf_bytes(
            sorted_rows,
            main_title,
            subtitle=sub or None,
            author_name=auth or None,
            dedication=dedication,
            toc_lines_out=toc,
        )

    # ------------------------------------------------------------------
    # Acknowledgment
    # ------------------------------------------------------------------
    p_ack = doc.add_paragraph()
    p_ack.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ack.paragraph_format.space_before = Pt(_CHAPTER_BEFORE_PT)
    p_ack.paragraph_format.space_after  = Pt(_CHAPTER_AFTER_PT)
    r_ack = p_ack.add_run("ACKNOWLEDGMENT")
    r_ack.font.name = _FONT_BODY
    r_ack.font.bold = True
    r_ack.font.size = Pt(_CHAPTER_PT)

    _add_body_paragraph(
        doc,
        "The author wishes to thank everyone who supported the creation of this book.",
        is_last_in_chapter=True,
    )

    doc.add_page_break()

    # ------------------------------------------------------------------
    # About the Author
    # ------------------------------------------------------------------
    p_abt = doc.add_paragraph()
    p_abt.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_abt.paragraph_format.space_before = Pt(_CHAPTER_BEFORE_PT)
    p_abt.paragraph_format.space_after  = Pt(_CHAPTER_AFTER_PT)
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
    about_paras = _split_paragraphs("\n\n".join(about_parts))
    for i, para in enumerate(about_paras):
        _add_body_paragraph(doc, para, is_last_in_chapter=(i == len(about_paras) - 1))

    doc.add_page_break()

    # ------------------------------------------------------------------
    # Dedication (optional, before TOC)
    # ------------------------------------------------------------------
    ded = (dedication or "").strip()
    if ded:
        p_dd = doc.add_paragraph()
        p_dd.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_dd.paragraph_format.space_before = Pt(_CHAPTER_BEFORE_PT)
        p_dd.paragraph_format.space_after = Pt(_CHAPTER_AFTER_PT)
        r_dd = p_dd.add_run("DEDICATION")
        r_dd.font.name = _FONT_BODY
        r_dd.font.bold = True
        r_dd.font.size = Pt(_CHAPTER_PT)

        ded_paras = _split_paragraphs(ded)
        for i, para in enumerate(ded_paras):
            _add_body_paragraph(
                doc, para, is_last_in_chapter=(i == len(ded_paras) - 1)
            )
        doc.add_page_break()

    # ------------------------------------------------------------------
    # Table of Contents
    # ------------------------------------------------------------------
    p_toc = doc.add_paragraph()
    p_toc.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_toc.paragraph_format.space_after = Pt(10)
    r_toc = p_toc.add_run("TABLE OF CONTENTS")
    r_toc.font.name = _FONT_BODY
    r_toc.font.bold = True
    r_toc.font.size = Pt(_TOC_HEADING_PT)

    last_toc_para = None
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
        last_toc_para = p_line

    # Page break on last TOC paragraph so Chapter 1 starts on the next page (no empty para)
    if last_toc_para is not None:
        last_toc_para.add_run().add_break(WD_BREAK.PAGE)
    else:
        p_toc.add_run().add_break(WD_BREAK.PAGE)

    # ------------------------------------------------------------------
    # Chapters
    # ------------------------------------------------------------------
    for i, (num, raw_title, body) in enumerate(chapter_entries):
        _add_two_line_chapter_heading(doc, num, raw_title)

        if body and body.strip():
            paras = _split_paragraphs(body)
            for pi, para in enumerate(paras):
                _add_body_paragraph(
                    doc, para, is_last_in_chapter=(pi == len(paras) - 1)
                )

        if i < len(chapter_entries) - 1:
            doc.add_page_break()

    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()


def write_docx_to_path(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)