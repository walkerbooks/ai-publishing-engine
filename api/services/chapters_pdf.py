"""Build a simple PDF from stored chapter bodies (markdown → plain text + fpdf2).

Formatting matched to the reference .docx (analysed from XML):
  - 6×9 trade paperback
  - Margins: top 1.03" (26.14 mm) / left+right 0.75" (19.05 mm) / bottom 0.19" (4.94 mm)
  - Cover: Times New Roman bold, colour #231F20; title 36 pt / subtitle 20 pt; By + author 24 pt
    anchored to the bottom of the page (By second-to-last line, author last)
  - Chapter headings: Times NR bold 16 pt, centred, 0 pt before / 8 pt after
  - Body: Times NR 11 pt, justified, NO side indents, 1.15× line spacing,
    0 pt before / 8 pt after each paragraph
  - TOC: after About the Author (and optional Dedication), before chapters; dot-leader rows
"""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

# Optional bundled DejaVu fonts (avoid Windows Fonts charmap decode errors).
_BUNDLED_DEJAVU = (
    Path(__file__).resolve().parent.parent / "data" / "fonts" / "DejaVuSans.ttf"
)
_BUNDLED_DEJAVU_SERIF = (
    Path(__file__).resolve().parent.parent / "data" / "fonts" / "DejaVuSerif.ttf"
)

# ---------------------------------------------------------------------------
# Page geometry — matched to reference XML (DXA ÷ 1440 × 25.4 = mm)
# ---------------------------------------------------------------------------
_PAGE_W_MM = 6 * 25.4          # 152.4 mm
_PAGE_H_MM = 9 * 25.4          # 228.6 mm

# Reference margins (DXA → mm):  top=1480, left/right=1080, bottom=280
_MARGIN_TOP_MM    = 1480 / 1440 * 25.4   # ≈ 26.14 mm  (1.03")
_MARGIN_SIDE_MM   = 1080 / 1440 * 25.4   # ≈ 19.05 mm  (0.75")
_MARGIN_BOTTOM_MM =  280 / 1440 * 25.4   # ≈  4.94 mm  (0.19") — matches reference

# Content width: page − left − right
_CONTENT_W_MM = _PAGE_W_MM - 2 * _MARGIN_SIDE_MM   # ≈ 114.3 mm

# ---------------------------------------------------------------------------
# Typography — matched to reference XML
# ---------------------------------------------------------------------------

# Cover: Times New Roman bold #231F20 — sizes aligned with ``chapters_docx`` (36 / 20 / 24 pt).
_COVER_MAIN_PT  = 36
_COVER_SUB_PT   = 20
_COVER_BY_PT    = 24
_COVER_TEXT_RGB = (35, 31, 32)    # #231F20

_CHAPTER_PT     = 16    # 32 half-pts — Heading1 in reference
_TOC_HEADING_PT = 16
_TOC_LINE_PT    = 11    # 22 half-pts — same as body
_BODY_PT        = 11    # 22 half-pts

# Body spacing — from BodyText paragraph XML:
#   line=276 auto  →  276/240 ≈ 1.15×  (was 264/240 ≈ 1.10)
#   before=0 twips, after=160 twips = 8 pt  (was 12 pt)
_BODY_LINE_MULT = 276 / 240   # ≈ 1.15
_PARA_AFTER_PT  = 8           # 160 twips ÷ 20


# ---------------------------------------------------------------------------
# Utility helpers (unchanged from original)
# ---------------------------------------------------------------------------

def _int_to_roman_upper(n: int) -> str:
    """Uppercase Roman numerals for front-matter TOC lines (e.g. 3 → III)."""
    if n <= 0:
        return ""
    vals = [
        (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
        (100, "C"),  (90, "XC"), (50, "L"),  (40, "XL"),
        (10, "X"),   (9, "IX"),  (5, "V"),   (4, "IV"),  (1, "I"),
    ]
    parts: list[str] = []
    x = n
    for v, s in vals:
        while x >= v:
            parts.append(s)
            x -= v
    return "".join(parts)


def _strip_leading_chapter_prefix(raw_title: str, chapter_num: int) -> str:
    t = (raw_title or "").strip()
    t = re.sub(r"^chapter\s*\d+\s*:\s*", "", t, flags=re.I).strip()
    t = re.sub(r"^chapter\s*\d+\s+", "",  t, flags=re.I).strip()
    if not t:
        return f"CHAPTER {chapter_num}"
    return t


def format_manuscript_chapter_heading(chapter_num: int, raw_title: str) -> str:
    """Book-style heading: CHAPTER N TITLE (all caps, no colon), matching trade TOC."""
    body = _strip_leading_chapter_prefix(raw_title, chapter_num)
    return f"CHAPTER {chapter_num} {body.upper()}"


def strip_leading_chapter_heading_from_markdown(content: str, chapter_num: int) -> str:
    """
    Drop the first line when it repeats the chapter title (LLM markdown), e.g.
    ``## Chapter 5: Tragic Conclusion`` or ``CHAPTER 5 TRAGIC CONCLUSION``.
    """
    t = (content or "").replace("\r\n", "\n").replace("\r", "\n")
    if not t.strip():
        return t
    n = int(chapter_num)
    pat = re.compile(
        rf"(?:^[ \t]*\n)*"
        rf"(?:"
        rf"^[ \t]*#{{1,6}}[ \t]*Chapter[ \t]+{n}\b[ \t]*[^\n]*"
        rf"|^[ \t]*Chapter[ \t]+{n}\b[ \t]*[:\u2013\u2014\-][ \t]*[^\n]*"
        rf"|^[ \t]*(?-i:CHAPTER)[ \t]+{n}\b[ \t]+[^\n]+"
        rf")\s*(?:\n+|\Z)",
        re.IGNORECASE | re.MULTILINE,
    )
    stripped, n_sub = pat.subn("", t, count=1)
    return stripped.lstrip() if n_sub else t.lstrip()


def _pt_to_mm(pt: float) -> float:
    return pt * 25.4 / 72.0


def _cover_by_author_block_height_mm(
    pdf: Any,
    *,
    title_fam: str,
    title_has_bold: bool,
    author_fam: str | None,
    author_bold_loaded: bool,
    auth_line: str,
    txt: Any,
) -> float:
    """Vertical space (mm) for the centred By line + gap + author block (with wrapping)."""
    from fpdf.enums import MethodReturnValue

    h_line = _pt_to_mm(_COVER_BY_PT * 1.15)
    gap = _pt_to_mm(4)
    ew = pdf.epw

    pdf.set_font(title_fam, style="B" if title_has_bold else "", size=_COVER_BY_PT)
    by_lines = pdf.multi_cell(
        w=ew,
        h=h_line,
        text=txt("By"),
        align="C",
        dry_run=True,
        output=MethodReturnValue.LINES,
    )
    n_by = len(by_lines)

    if author_fam:
        pdf.set_font(
            author_fam, style="B" if author_bold_loaded else "", size=_COVER_BY_PT
        )
    else:
        pdf.set_font(title_fam, style="B" if title_has_bold else "", size=_COVER_BY_PT)
    auth_lines = pdf.multi_cell(
        w=ew,
        h=h_line,
        text=auth_line,
        align="C",
        dry_run=True,
        output=MethodReturnValue.LINES,
    )
    n_auth = len(auth_lines)

    return n_by * h_line + gap + n_auth * h_line


def _latin1_safe(text: str) -> str:
    return text.encode("latin-1", errors="replace").decode("latin-1")


def _markdownish_to_plain(text: str) -> str:
    t = text.replace("\r\n", "\n").replace("\r", "\n")
    t = re.sub(r"^#+\s+",        "", t, flags=re.MULTILINE)
    t = re.sub(r"\*\*([^*]+)\*\*", r"\1", t)
    t = re.sub(r"__([^_]+)__",    r"\1", t)
    t = re.sub(r"\*([^*]+)\*",    r"\1", t)
    t = re.sub(r"`([^`]+)`",      r"\1", t)
    t = re.sub(r"^\s*[-*+]\s+",   "• ",  t, flags=re.MULTILINE)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def _smart_double_quotes(s: str) -> str:
    """
    Replace ASCII double quotes with typographic quotes (“ U+201C / ” U+201D).
    Alternating open/close works for normal dialogue and quoted phrases like "the price".
    """
    if '"' not in s:
        return s
    parts = s.split('"')
    out: list[str] = [parts[0]]
    for i, part in enumerate(parts[1:], start=1):
        out.append("\u201c" if (i % 2 == 1) else "\u201d")
        out.append(part)
    return "".join(out)


def _unicode_ttf_path() -> Path | None:
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


def _windows_fonts_dir() -> Path:
    return Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"


def _try_register_font(
    pdf: Any,
    family: str,
    regular: Path,
    bold: Path | None,
) -> tuple[bool, bool]:
    """Returns (regular_loaded, bold_loaded)."""
    try:
        if not regular.is_file():
            return (False, False)
        pdf.add_font(family, "", str(regular))
        bold_ok = False
        if bold is not None and bold.is_file():
            pdf.add_font(family, "B", str(bold))
            bold_ok = True
        return (True, bold_ok)
    except Exception as e:
        log.warning("Could not load font family %s from %s: %s", family, regular, e)
        return (False, False)


def _dejavu_sans_bold_path(regular: Path) -> Path:
    return regular.parent / regular.name.replace("DejaVuSans.ttf", "DejaVuSans-Bold.ttf")


def _register_manuscript_fonts(pdf: Any) -> tuple[str, str, bool, bool, bool]:
    """
    Register Times New Roman for all text (cover, headings, body, TOC).
    Returns (title_fam, body_fam, use_unicode, body_has_bold, title_has_bold);
    ``title_fam`` and ``body_fam`` are the same registered family when load succeeds.
    """
    fam = "MsBody"
    wf = _windows_fonts_dir()

    body_ok, body_bold = _try_register_font(
        pdf, fam, wf / "times.ttf", wf / "timesbd.ttf"
    )

    if not body_ok:
        serif_candidates: list[tuple[Path, Path | None]] = [
            (
                Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"),
                Path("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"),
            ),
            (
                Path("/usr/share/fonts/TTF/DejaVuSerif.ttf"),
                Path("/usr/share/fonts/TTF/DejaVuSerif-Bold.ttf"),
            ),
        ]
        try:
            if _BUNDLED_DEJAVU_SERIF.is_file():
                serif_candidates.insert(
                    0,
                    (
                        _BUNDLED_DEJAVU_SERIF,
                        _BUNDLED_DEJAVU_SERIF.parent / "DejaVuSerif-Bold.ttf",
                    ),
                )
        except OSError:
            pass
        for reg, bld in serif_candidates:
            ok, bb = _try_register_font(pdf, fam, reg, bld)
            if ok:
                body_ok = True
                body_bold = bb
                break

    if not body_ok:
        p = _unicode_ttf_path()
        if p is not None:
            body_ok, body_bold = _try_register_font(
                pdf, fam, p, _dejavu_sans_bold_path(p)
            )

    if not body_ok:
        return ("Helvetica", "Helvetica", False, False, False)
    return (fam, fam, True, body_bold, body_bold)


def _register_cover_fonts(
    pdf: Any, _fallback_sans_bold: Path | None
) -> tuple[str | None, str | None, bool, bool]:
    """
    Cover uses the same Times family as ``_register_manuscript_fonts`` (no Tahoma/Palatino).
    Returns (cover_fam, author_fam, cover_use_style_b, author_has_bold) — all unused
    when None/False so callers fall back to ``title_fam`` / ``body_fam``.
    """
    return (None, None, False, False)


def _format_subtitle_line(subtitle: str) -> str:
    s = subtitle.strip()
    if not s:
        return s
    if s.startswith("(") and s.endswith(")"):
        return s
    return f"({s})"


def _split_paragraphs(text: str) -> list[str]:
    parts = re.split(r"\n\s*\n+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def _pdf_draw_toc_row(
    pdf: Any,
    body_fam: str,
    *,
    label_upper: str,
    page_disp: str,
    printable_w_mm: float,
    toc_line_h: float,
    txt: Any,
    link_id: int | None = None,
) -> None:
    """One TOC line: left label, dot leaders, right-aligned page label (trade style)."""
    pdf.set_font(body_fam, size=_TOC_LINE_PT)
    left  = txt(label_upper)
    right = txt(page_disp)
    w_left  = pdf.get_string_width(left + " ")
    w_right = pdf.get_string_width(" " + right)
    dot_w   = pdf.get_string_width(".")
    mid     = max(0.0, printable_w_mm - w_left - w_right)
    n_dots  = max(3, int(mid / dot_w) if dot_w > 0 else 3)
    dots    = "." * n_dots
    lk      = link_id if link_id is not None else ""
    pdf.cell(w=w_left, h=toc_line_h, text=left + " ",  border=0, link=lk)
    pdf.cell(w=mid,    h=toc_line_h, text=dots,         border=0, link=lk)
    pdf.cell(w=w_right,h=toc_line_h, text=" " + right,  border=0, align="R", link=lk)
    pdf.ln(toc_line_h + _pt_to_mm(2))


# ---------------------------------------------------------------------------
# Main PDF builder
# ---------------------------------------------------------------------------

def build_manuscript_pdf_bytes(
    chapters: list[dict[str, Any]],
    book_title: str,
    *,
    subtitle: str | None = None,
    author_name: str | None = None,
    dedication: str | None = None,
    toc_lines_out: list[tuple[str, str]] | None = None,
) -> bytes:
    """
    Concatenate chapters (sorted by chapter_number) into one PDF.

    Formatting mirrors the reference .docx:
      - 6×9, top 1.03" / sides 0.75" / bottom 0.19"
      - Times New Roman throughout; 11 pt body; 1.15× leading; 8 pt after each para
      - Front matter then TOC then chapters (TOC Roman labels for pre-chapter sections)
    """
    from fpdf import FPDF

    sorted_rows = sorted(
        [c for c in chapters if isinstance(c, dict)],
        key=lambda x: int(x.get("chapter_number") or 0),
    )
    if not sorted_rows:
        raise ValueError("no chapters to render")

    pdf = FPDF(format=(_PAGE_W_MM, _PAGE_H_MM), unit="mm")
    # Asymmetric margins matching reference XML
    pdf.set_margins(_MARGIN_SIDE_MM, _MARGIN_TOP_MM, _MARGIN_SIDE_MM)
    pdf.set_auto_page_break(auto=True, margin=_MARGIN_BOTTOM_MM)

    title_fam, body_fam, use_unicode, body_has_bold, title_has_bold = (
        _register_manuscript_fonts(pdf)
    )
    cover_fam, author_fam, cover_use_b, author_bold_loaded = _register_cover_fonts(
        pdf, None
    )

    def txt(s: str) -> str:
        return s if use_unicode else _latin1_safe(s)

    # Derived measurements
    body_line_h     = _pt_to_mm(_BODY_PT) * _BODY_LINE_MULT   # ≈ 1.15× body pt
    para_gap        = _pt_to_mm(_PARA_AFTER_PT)                # 8 pt → mm after each para
    chapter_line_h  = _pt_to_mm(_CHAPTER_PT * 1.2)
    toc_line_h      = _pt_to_mm(_TOC_LINE_PT) * 1.2

    # ------------------------------------------------------------------
    # Cover font helpers
    # ------------------------------------------------------------------
    def _cover_font_main() -> None:
        if cover_fam:
            pdf.set_font(cover_fam, style="B" if cover_use_b else "", size=_COVER_MAIN_PT)
        else:
            pdf.set_font(title_fam, style="B" if title_has_bold else "", size=_COVER_MAIN_PT)

    def _cover_font_sub() -> None:
        if cover_fam:
            pdf.set_font(cover_fam, style="B" if cover_use_b else "", size=_COVER_SUB_PT)
        else:
            pdf.set_font(title_fam, style="B" if title_has_bold else "", size=_COVER_SUB_PT)

    # ------------------------------------------------------------------
    # Strings
    # ------------------------------------------------------------------
    main_title = txt((book_title or "Manuscript").strip()[:500])
    sub        = (subtitle or "").strip()
    sub_line   = txt(_format_subtitle_line(sub)) if sub else ""
    auth       = (author_name or "").strip()
    auth_line  = txt(auth[:300]) if auth else ""

    # ------------------------------------------------------------------
    # Cover page — title/subtitle at top; By + author at bottom of printable area
    # ------------------------------------------------------------------
    pdf.add_page()
    pdf.ln(_pt_to_mm(28))
    pdf.set_text_color(*_COVER_TEXT_RGB)
    _cover_font_main()
    pdf.multi_cell(0, _pt_to_mm(_COVER_MAIN_PT * 1.2), main_title, align="C")
    pdf.set_x(pdf.l_margin)
    if not auth_line:
        pdf.ln(_pt_to_mm(8))

    if sub_line:
        _cover_font_sub()
        pdf.multi_cell(0, _pt_to_mm(_COVER_SUB_PT * 1.15), sub_line, align="C")
        pdf.set_x(pdf.l_margin)

    if auth_line:
        y_after_header = pdf.get_y()
        content_bottom = float(pdf.h) - float(pdf.b_margin)
        block_h = _cover_by_author_block_height_mm(
            pdf,
            title_fam=title_fam,
            title_has_bold=title_has_bold,
            author_fam=author_fam,
            author_bold_loaded=author_bold_loaded,
            auth_line=auth_line,
            txt=txt,
        )
        # Small inset so the last line does not trip fpdf's page break / rounding
        safety_mm = 2.0
        target_y = content_bottom - block_h - safety_mm
        min_y = y_after_header + _pt_to_mm(12)
        if target_y < min_y:
            target_y = min_y
        pdf.set_y(target_y)
        pdf.set_x(pdf.l_margin)

        pdf.set_font(
            title_fam, style="B" if title_has_bold else "", size=_COVER_BY_PT
        )
        h_by = _pt_to_mm(_COVER_BY_PT * 1.15)
        pdf.multi_cell(0, h_by, txt("By"), align="C")
        pdf.set_x(pdf.l_margin)
        pdf.ln(_pt_to_mm(4))
        if author_fam:
            pdf.set_font(
                author_fam, style="B" if author_bold_loaded else "", size=_COVER_BY_PT
            )
        else:
            pdf.set_font(
                title_fam, style="B" if title_has_bold else "", size=_COVER_BY_PT
            )
        pdf.multi_cell(0, h_by, auth_line, align="C")

    pdf.set_text_color(0, 0, 0)

    # ------------------------------------------------------------------
    # Pre-process chapters
    # ------------------------------------------------------------------
    chapter_entries: list[tuple[str, str, str]] = []
    for row in sorted_rows:
        num       = int(row.get("chapter_number") or 0)
        raw_title = str(row.get("title") or f"Chapter {num}").strip()[:500]
        raw_body  = strip_leading_chapter_heading_from_markdown(
            str(row.get("content") or ""), num
        )
        body    = txt(_smart_double_quotes(_markdownish_to_plain(raw_body)))
        heading = txt(format_manuscript_chapter_heading(num, raw_title))
        if body or raw_title.strip():
            chapter_entries.append((heading, heading, body))

    printable_w = _CONTENT_W_MM
    ded_raw  = (dedication or "").strip()
    ded_body = txt(ded_raw) if ded_raw else txt(" ")

    # ------------------------------------------------------------------
    # Helper: render a section heading (16 pt bold, centred, 0/8 pt spacing)
    # ------------------------------------------------------------------
    def _render_section_heading(label: str) -> None:
        if body_has_bold:
            pdf.set_font(body_fam, style="B", size=_CHAPTER_PT)
        else:
            pdf.set_font(body_fam, size=_CHAPTER_PT)
        pdf.multi_cell(0, chapter_line_h, txt(label), align="C")
        # 8 pt gap after heading (matches Heading1 after=160 twips)
        pdf.ln(_pt_to_mm(_PARA_AFTER_PT))

    # ------------------------------------------------------------------
    # Helper: render body paragraphs (11 pt, justified, 1.15×, 8 pt after)
    # ------------------------------------------------------------------
    def _render_body_paragraphs(body_text: str, trailing_gap_mm: float = 0.0) -> None:
        pdf.set_font(body_fam, size=_BODY_PT)
        for para in _split_paragraphs(body_text) or [body_text]:
            # before = 0 pt (matches BodyText before=0 twips in reference XML)
            pdf.multi_cell(0, body_line_h, para, align="J")
            # after = 8 pt  (matches BodyText after=160 twips)
            pdf.ln(para_gap)
        if trailing_gap_mm:
            pdf.ln(trailing_gap_mm)

    # ------------------------------------------------------------------
    # TOC renderer (called by fpdf2 at output time)
    # ------------------------------------------------------------------
    def render_trade_toc(pdf2: Any, outline: list[Any]) -> None:
        if body_has_bold:
            pdf2.set_font(body_fam, style="B", size=_TOC_HEADING_PT)
        else:
            pdf2.set_font(body_fam, size=_TOC_HEADING_PT)
        pdf2.multi_cell(
            0, _pt_to_mm(_TOC_HEADING_PT * 1.2), txt("TABLE OF CONTENTS"), align="C"
        )
        pdf2.ln(_pt_to_mm(10))
        pdf2.set_font(body_fam, size=_TOC_LINE_PT)
        if not outline:
            return
        first_ch_idx = next(
            (
                i
                for i, sec in enumerate(outline)
                if str(sec.name).upper().startswith("CHAPTER ")
            ),
            len(outline),
        )
        if first_ch_idx < len(outline):
            first_chapter_page = outline[first_ch_idx].page_number
        else:
            first_chapter_page = outline[-1].page_number
        if toc_lines_out is not None:
            toc_lines_out.clear()
        for i, sec in enumerate(outline):
            if first_ch_idx < len(outline) and i < first_ch_idx:
                disp = _int_to_roman_upper(sec.page_number)
            elif first_ch_idx < len(outline) and i >= first_ch_idx:
                disp = str(sec.page_number - first_chapter_page + 1)
            else:
                disp = _int_to_roman_upper(sec.page_number)
            link_id = pdf2.add_link(page=sec.page_number)
            _pdf_draw_toc_row(
                pdf2,
                body_fam,
                label_upper=str(sec.name).upper(),
                page_disp=disp,
                printable_w_mm=printable_w,
                toc_line_h=toc_line_h,
                txt=txt,
                link_id=link_id,
            )
            if toc_lines_out is not None:
                toc_lines_out.append((str(sec.name).upper(), disp))

    # ------------------------------------------------------------------
    # Front matter (matches DOCX order, without a separate copyright page)
    # ------------------------------------------------------------------
    pdf.add_page()
    pdf.start_section("ACKNOWLEDGMENT", level=0)
    _render_section_heading("ACKNOWLEDGMENT")
    _render_body_paragraphs(
        txt("The author wishes to thank everyone who supported the creation of this book.")
    )

    pdf.add_page()
    pdf.start_section("ABOUT THE AUTHOR", level=0)
    _render_section_heading("ABOUT THE AUTHOR")
    about_lines = []
    if auth_line:
        about_lines.append(auth_line)
    about_lines.append(
        txt("This author writes with the goal of connecting with readers through "
            "honest, vivid storytelling.")
    )
    _render_body_paragraphs("\n\n".join(about_lines))

    if ded_raw:
        pdf.add_page()
        pdf.start_section("DEDICATION", level=0)
        _render_section_heading("DEDICATION")
        _render_body_paragraphs(ded_body)

    # ------------------------------------------------------------------
    # Table of contents — after About (and optional Dedication), before chapters
    # ------------------------------------------------------------------
    pdf.add_page()
    pdf.insert_toc_placeholder(render_trade_toc, pages=1, allow_extra_pages=True)

    # ------------------------------------------------------------------
    # Chapters — start on the page after the TOC reservation
    # ------------------------------------------------------------------
    pdf.add_page()
    for i, (_line, heading, body) in enumerate(chapter_entries):
        if i > 0:
            pdf.add_page()
        pdf.start_section(heading, level=0)
        _render_section_heading(heading)

        if body:
            # Extra 8 pt trailing gap after the last paragraph in the chapter
            # (mirrors the +8 pt applied to the last para in the DOCX builder)
            _render_body_paragraphs(body, trailing_gap_mm=_pt_to_mm(8))

    # ------------------------------------------------------------------
    # Output
    # ------------------------------------------------------------------
    out = pdf.output()
    if isinstance(out, str):
        return out.encode("latin-1", errors="replace")
    return bytes(out)


# ---------------------------------------------------------------------------
# File I/O helpers (unchanged)
# ---------------------------------------------------------------------------

def write_pdf_to_path(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def write_pdf_export_metadata(
    pdf_path: Path, *, author: str | None, title: str | None
) -> None:
    """Sidecar JSON for download filename (``Author - Title.pdf``)."""
    meta_path = pdf_path.with_name(f"{pdf_path.stem}.export.json")
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"author": (author or "").strip(), "title": (title or "").strip()}
    meta_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def read_pdf_export_metadata(pdf_path: Path) -> dict[str, str] | None:
    """Returns ``author`` / ``title`` keys if ``{stem}.export.json`` exists next to the PDF."""
    meta_path = pdf_path.with_name(f"{pdf_path.stem}.export.json")
    if not meta_path.is_file():
        return None
    try:
        data = json.loads(meta_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeDecodeError):
        return None
    if not isinstance(data, dict):
        return None
    return {
        "author": str(data.get("author") or ""),
        "title":  str(data.get("title")  or ""),
    }