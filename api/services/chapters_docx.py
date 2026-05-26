"""Build a Word document from stored chapter bodies (markdown → plain text + python-docx).

Layout:
  - 6×9 trade paperback, margins: top 1.03" / left+right 0.75" / bottom 0.19"
  - Optional illustrated cover (PNG/JPEG): first page, scaled to fill the physical page
    (crop to page aspect), when bytes provided
  - Cover: title + subtitle auto-fit so By/author stay on page 1; By then author on the
    next line (24 pt bold centred), then two blank lines below the author
  - Copyright page (second page): 12 pt; © line + all rights reserved, centred
    horizontally and vertically on the page
  - Acknowledgment / About the Author: section title 16 pt bold centred; body 11 pt
  - TOC: after About the Author (and optional Dedication); heading 16 pt; entries 11 pt
    with dot leader to a right tab at the full text width; Chapter 1 begins on the following page
  - Chapters: "Chapter N" on first line, title on second line (both 16 pt bold centred);
    body 11 pt justified, **0.75 cm first-line indent** per paragraph, 1.15× line spacing
"""

from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any

from api.services.illustrated_cover_bytes import image_pixel_dimensions
from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_ROW_HEIGHT_RULE
from docx.enum.text import (
    WD_ALIGN_PARAGRAPH,
    WD_BREAK,
    WD_LINE_SPACING,
    WD_TAB_ALIGNMENT,
    WD_TAB_LEADER,
)
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor, Twips

from api.services.chapters_pdf import (
    _COVER_TEXT_RGB,
    _format_subtitle_line,
    ManuscriptFrontMatter,
    _markdownish_to_plain,
    _smart_double_quotes,
    _split_paragraphs,
    _strip_leading_chapter_prefix,
    _toc_clean_page_disp,
    _toc_display_label,
    build_manuscript_pdf_bytes,
    legacy_manuscript_front_matter,
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

# First-line indent for narrative body (ack / about / dedication / chapters)
_BODY_FIRST_LINE_INDENT = Cm(0.75)

# Printable width (inches) for wrap estimates on 6×9 with 0.75" side margins
_COVER_TEXT_WIDTH_IN = 4.5


def _toc_right_tab_position(doc: Document):
    """Right tab at the inner edge of the text block so page numbers align flush right."""
    sec = doc.sections[0]
    return sec.page_width - sec.left_margin - sec.right_margin


def _cover_chars_per_line(pt: float) -> int:
    """Approximate chars per line at ``pt`` bold Times on the cover text measure."""
    width_pt = _COVER_TEXT_WIDTH_IN * 72.0
    return max(10, int(width_pt / (pt * 0.52)))


def _cover_footer_reserve_pt() -> float:
    """
    Vertical space (pt) reserved for: 'By' line + gap + up to two author lines
    (long names may wrap) + two blank lines below (same leading as the By block).
    """
    line = _COVER_BY_PT * 1.15
    return line + 4.0 + (2.0 * line) + (2.0 * line)


def _estimate_cover_title_block_pt(
    main_title: str,
    subtitle_line: str,
    main_pt: float,
    sub_pt: float,
) -> float:
    """Conservative height (pt) for title + optional subtitle from top of body."""
    used = 28.0  # space_before cover title
    cm = _cover_chars_per_line(main_pt)
    n_main = max(1, (len(main_title) + cm - 1) // cm)
    used += n_main * (main_pt * 1.2)
    sub = (subtitle_line or "").strip()
    if sub:
        cs = _cover_chars_per_line(sub_pt)
        n_sub = max(1, (len(sub) + cs - 1) // cs)
        used += 6.0 + n_sub * (sub_pt * 1.15)
    used += 24.0  # Word / wrapping fudge
    return used


def _cover_fit_font_sizes(
    doc: Document,
    main_title: str,
    subtitle_line: str,
    *,
    require_by_footer: bool,
) -> tuple[float, float]:
    """
    Pick (title_pt, subtitle_pt) so title + subtitle fit on page 1.

    When ``require_by_footer`` is True, also reserve space for By + author + two lines
    below the author (same as ``_cover_footer_reserve_pt``).
    """
    usable = _section_body_usable_height_pt(doc)
    reserve = _cover_footer_reserve_pt() if require_by_footer else 24.0
    min_gap = 8.0
    main_candidates = [36.0, 32.0, 28.0, 26.0, 24.0, 22.0, 20.0, 18.0]
    sub_candidates = [20.0, 18.0, 16.0, 14.0, 12.0]

    sub_has = bool((subtitle_line or "").strip())
    for main_pt in main_candidates:
        sub_opts: list[float] = sub_candidates if sub_has else [0.0]
        for sub_pt in sub_opts:
            used = _estimate_cover_title_block_pt(
                main_title, subtitle_line if sub_has else "", main_pt, sub_pt
            )
            if used + reserve + min_gap <= usable:
                return (main_pt, sub_pt if sub_has else _COVER_SUB_PT)
    return (18.0, 12.0 if sub_has else _COVER_SUB_PT)


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


def _section_body_usable_height_pt(doc: Document) -> float:
    """Vertical space inside page margins (pt), for centering short blocks like copyright."""
    sec = doc.sections[0]
    return float(
        sec.page_height.pt - sec.top_margin.pt - sec.bottom_margin.pt
    )


def _cover_space_before_by_pt(
    doc: Document,
    main_title: str,
    *,
    subtitle_line: str,
    main_pt: float,
    sub_pt: float,
) -> float:
    """
    Space before the 'By' paragraph so title + subtitle + By + author + two lines
    below the author fit on page 1. Uses the same font sizes as the cover runs.
    """
    usable = _section_body_usable_height_pt(doc)
    used = _estimate_cover_title_block_pt(main_title, subtitle_line, main_pt, sub_pt)
    reserve = _cover_footer_reserve_pt()
    gap = usable - used - reserve
    return max(6.0, gap)


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
    Add one body paragraph: Times NR 11 pt, justified, 0.75 cm first-line indent,
    1.15× line spacing, 25.7 pt before, 8 pt after (16 pt after last para).
    """
    bp = doc.add_paragraph()
    r = bp.add_run(text)
    r.font.name = _FONT_BODY
    r.font.size = Pt(_BODY_PT)
    bp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    fmt = bp.paragraph_format
    fmt.first_line_indent = _BODY_FIRST_LINE_INDENT
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


def _set_table_borderless(table: Any) -> None:
    """Remove visible borders from a table (copyright layout helper)."""
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    if tbl_pr is None:
        tbl_pr = OxmlElement("w:tblPr")
        tbl.insert(0, tbl_pr)
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        node = OxmlElement(f"w:{edge}")
        node.set(qn("w:val"), "nil")
        node.set(qn("w:sz"), "0")
        node.set(qn("w:space"), "0")
        node.set(qn("w:color"), "auto")
        borders.append(node)
    old = tbl_pr.find(qn("w:tblBorders"))
    if old is not None:
        tbl_pr.remove(old)
    tbl_pr.append(borders)


def _add_copyright_page(doc: Document, author_name: str | None) -> None:
    """
    Copyright page: two lines, 12 pt, centred horizontally and vertically within
    the printable page using a full-height single-cell table (second page).
    """
    name = (author_name or "").strip() or "Umer Naeem"
    sec = doc.sections[0]
    usable_pt = _section_body_usable_height_pt(doc)
    content_w = sec.page_width - sec.left_margin - sec.right_margin

    tbl = doc.add_table(rows=1, cols=1)
    tbl.autofit = False
    _set_table_borderless(tbl)
    try:
        tbl.columns[0].width = content_w
    except (ValueError, AttributeError):
        pass

    row = tbl.rows[0]
    row.height_rule = WD_ROW_HEIGHT_RULE.EXACTLY
    row.height = Pt(int(usable_pt))

    cell = tbl.cell(0, 0)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER

    p1 = cell.paragraphs[0]
    p1.clear()
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.space_before = Pt(0)
    p1.paragraph_format.space_after = Pt(0)
    p1.paragraph_format.first_line_indent = Pt(0)
    r1 = p1.add_run(f"Copyright © 2025 by {name}")
    r1.font.name = _FONT_BODY
    r1.font.size = Pt(_COPYRIGHT_PT)
    r1.font.bold = False

    p2 = cell.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.paragraph_format.space_before = Pt(0)
    p2.paragraph_format.space_after = Pt(0)
    p2.paragraph_format.first_line_indent = Pt(0)
    r2 = p2.add_run("All rights reserved")
    r2.font.name = _FONT_BODY
    r2.font.size = Pt(_COPYRIGHT_PT)
    r2.font.bold = False
    p2.add_run().add_break(WD_BREAK.PAGE)


# ---------------------------------------------------------------------------
# Main builder
# ---------------------------------------------------------------------------

def _add_illustrated_cover_docx_page(doc: Document, image_bytes: bytes) -> None:
    """Insert a full-page illustrated cover and a trailing page break."""
    sec = doc.sections[0]
    pw_in = sec.page_width.inches
    ph_in = sec.page_height.inches
    dims = image_pixel_dimensions(image_bytes)
    w_in: float
    h_in: float
    if dims:
        iw, ih = dims
        if iw > 0 and ih > 0:
            ri = iw / ih
            rp = pw_in / ph_in
            if ri >= rp:
                h_in = ph_in
                w_in = ph_in * ri
            else:
                w_in = pw_in
                h_in = pw_in / ri
        else:
            w_in, h_in = pw_in, ph_in
    else:
        w_in, h_in = pw_in, ph_in

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run()
    run.add_picture(BytesIO(image_bytes), width=Inches(w_in), height=Inches(h_in))
    p.add_run().add_break(WD_BREAK.PAGE)


def build_manuscript_docx_bytes(
    chapters: list[dict[str, Any]],
    book_title: str,
    *,
    subtitle: str | None = None,
    author_name: str | None = None,
    dedication: str | None = None,
    front_matter: ManuscriptFrontMatter | None = None,
    toc_lines: list[tuple[str, str]] | None = None,
    illustrated_cover_image: bytes | None = None,
) -> bytes:
    """
    Concatenate chapters (sorted by chapter_number) into one .docx.

    Front order: optional illustrated cover → cover (title page) → copyright →
    acknowledgment → about the author → optional dedication → table of contents → chapters.

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

    if illustrated_cover_image:
        _add_illustrated_cover_docx_page(doc, illustrated_cover_image)

    cover_rgb = RGBColor(*_COVER_TEXT_RGB)

    main_title = (book_title or "Manuscript").strip()[:500] or "Manuscript"
    sub        = (subtitle or "").strip()
    sub_line   = _format_subtitle_line(sub) if sub else ""
    auth       = (author_name or "").strip()[:300]
    fm = front_matter or legacy_manuscript_front_matter(auth or None)

    # ------------------------------------------------------------------
    # Cover page — title/subtitle (auto-fit); By then author; two lines below author
    # ------------------------------------------------------------------
    cover_main_pt, cover_sub_pt = _cover_fit_font_sizes(
        doc, main_title, sub_line, require_by_footer=bool(auth)
    )

    p_main = doc.add_paragraph()
    p_main.paragraph_format.space_before = Pt(28)
    p_main.paragraph_format.space_after = Pt(0) if auth else Pt(8)
    p_main.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_main = p_main.add_run(main_title)
    r_main.font.name = _FONT_COVER
    r_main.font.bold = True
    r_main.font.size = Pt(cover_main_pt)
    r_main.font.color.rgb = cover_rgb

    if sub_line:
        p_sub = doc.add_paragraph()
        p_sub.paragraph_format.space_before = Pt(0)
        p_sub.paragraph_format.space_after = Pt(0)
        p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_sub = p_sub.add_run(sub_line)
        r_sub.font.name = _FONT_COVER
        r_sub.font.bold = True
        r_sub.font.size = Pt(cover_sub_pt)
        r_sub.font.color.rgb = cover_rgb

    if auth:
        p_by = doc.add_paragraph()
        p_by.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_by.paragraph_format.space_before = Pt(
            _cover_space_before_by_pt(
                doc,
                main_title,
                subtitle_line=sub_line,
                main_pt=cover_main_pt,
                sub_pt=cover_sub_pt,
            )
        )
        p_by.paragraph_format.space_after = Pt(0)
        p_by.paragraph_format.keep_with_next = True
        r_by = p_by.add_run("By")
        r_by.font.name = _FONT_BY_LINE
        r_by.font.bold = True
        r_by.font.size = Pt(_COVER_BY_PT)
        r_by.font.color.rgb = cover_rgb

        p_auth = doc.add_paragraph()
        p_auth.paragraph_format.space_before = Pt(4)
        # Two blank lines (same leading as By block) below author on page 1
        p_auth.paragraph_format.space_after = Pt(2 * _COVER_BY_PT * 1.15)
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
        build_manuscript_pdf_bytes(
            sorted_rows,
            main_title,
            subtitle=sub or None,
            author_name=auth or None,
            dedication=dedication,
            front_matter=fm,
            toc_lines_out=toc,
            illustrated_cover_image=illustrated_cover_image,
        )

    # ------------------------------------------------------------------
    # Acknowledgment (optional)
    # ------------------------------------------------------------------
    if fm.acknowledgement_body is not None:
        p_ack = doc.add_paragraph()
        p_ack.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_ack.paragraph_format.space_before = Pt(_CHAPTER_BEFORE_PT)
        p_ack.paragraph_format.space_after = Pt(_CHAPTER_AFTER_PT)
        r_ack = p_ack.add_run("ACKNOWLEDGMENT")
        r_ack.font.name = _FONT_BODY
        r_ack.font.bold = True
        r_ack.font.size = Pt(_CHAPTER_PT)

        ack_plain = _smart_double_quotes(_markdownish_to_plain(fm.acknowledgement_body))
        ack_paras = _split_paragraphs(ack_plain)
        for i, para in enumerate(ack_paras):
            _add_body_paragraph(
                doc, para, is_last_in_chapter=(i == len(ack_paras) - 1)
            )

        doc.add_page_break()

    # ------------------------------------------------------------------
    # About the Author (optional)
    # ------------------------------------------------------------------
    if fm.about_the_author_body is not None:
        p_abt = doc.add_paragraph()
        p_abt.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_abt.paragraph_format.space_before = Pt(_CHAPTER_BEFORE_PT)
        p_abt.paragraph_format.space_after = Pt(_CHAPTER_AFTER_PT)
        r_abt = p_abt.add_run("ABOUT THE AUTHOR")
        r_abt.font.name = _FONT_BODY
        r_abt.font.bold = True
        r_abt.font.size = Pt(_CHAPTER_PT)

        about_plain = _smart_double_quotes(_markdownish_to_plain(fm.about_the_author_body))
        about_paras = _split_paragraphs(about_plain)
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

    tab_pos = _toc_right_tab_position(doc)
    last_toc_para = None
    for label, page_str in toc:
        p_line = doc.add_paragraph()
        p_line.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p_line.paragraph_format.space_after = Pt(2)
        p_line.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
        p_line.paragraph_format.line_spacing = 1.2
        p_line.paragraph_format.tab_stops.add_tab_stop(
            tab_pos, WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS
        )
        disp_label = _toc_display_label(label)
        page_clean = _toc_clean_page_disp(page_str)
        for chunk in (disp_label, "\t", page_clean):
            r = p_line.add_run(chunk)
            r.font.name = _FONT_BODY
            r.font.size = Pt(_TOC_LINE_PT)
            r.font.bold = False
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