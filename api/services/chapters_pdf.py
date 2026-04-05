"""Build a simple PDF from stored chapter bodies (markdown → plain text + fpdf2)."""

from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

# Optional: copy DejaVuSans.ttf from https://github.com/dejavu-fonts/dejavu-fonts (ttf/) here.
# Avoids Windows Fonts\arial.ttf etc.: fontTools can hit 'charmap' decode errors on those files.
_BUNDLED_DEJAVU = (
    Path(__file__).resolve().parent.parent / "data" / "fonts" / "DejaVuSans.ttf"
)
_BUNDLED_DEJAVU_SERIF = (
    Path(__file__).resolve().parent.parent / "data" / "fonts" / "DejaVuSerif.ttf"
)

# Isaac Adams / Word manuscript template: 6" × 9" trade size, 1" margins (see word/document.xml).
_PAGE_W_MM = 6 * 25.4
_PAGE_H_MM = 9 * 25.4
_MARGIN_MM = 25.4  # 1 inch

# Cover page (Isaac Adams manuscript): main + subtitle = Century Gothic bold, #231F20;
# "By" = Verdana bold 24pt; author name = Palatino Linotype bold 24pt (see word/document.xml).
_COVER_MAIN_PT = 28
_COVER_SUB_PT = 24
_COVER_BY_PT = 24
_COVER_TEXT_RGB = (35, 31, 32)  # #231F20
# Heading 1 = Times New Roman bold 16pt centered; Normal = 11pt, ~1.1 line, 12pt after.
_CHAPTER_PT = 16
_TOC_HEADING_PT = 16
_TOC_LINE_PT = 11
_BODY_PT = 11
_BODY_LINE_MULT = 264 / 240  # Normal w:line / single-line grid (≈1.1)
_PARA_AFTER_PT = 12

# Trade trim content width (6" page − 1" left − 1" right).
_CONTENT_W_MM = _PAGE_W_MM - 2 * _MARGIN_MM


def _int_to_roman_upper(n: int) -> str:
    """Uppercase Roman numerals for front-matter TOC lines (e.g. 3 → III)."""
    if n <= 0:
        return ""
    vals = [
        (1000, "M"),
        (900, "CM"),
        (500, "D"),
        (400, "CD"),
        (100, "C"),
        (90, "XC"),
        (50, "L"),
        (40, "XL"),
        (10, "X"),
        (9, "IX"),
        (5, "V"),
        (4, "IV"),
        (1, "I"),
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
    t = re.sub(r"^chapter\s*\d+\s+", "", t, flags=re.I).strip()
    if not t:
        return f"CHAPTER {chapter_num}"
    return t


def format_manuscript_chapter_heading(chapter_num: int, raw_title: str) -> str:
    """Book-style heading: CHAPTER N TITLE (all caps, no colon), matching trade TOC."""
    body = _strip_leading_chapter_prefix(raw_title, chapter_num)
    return f"CHAPTER {chapter_num} {body.upper()}"


def _pt_to_mm(pt: float) -> float:
    return pt * 25.4 / 72.0


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
    Register fonts to match the reference Word manuscript (Verdana, Times body).
    Returns (title_font_family, body_font_family, use_unicode, body_has_bold, title_has_bold).
    """
    title_fam = "MsTitle"
    body_fam = "MsBody"
    wf = _windows_fonts_dir()
    title_ok, title_bold = _try_register_font(
        pdf, title_fam, wf / "verdana.ttf", wf / "verdanab.ttf"
    )
    body_ok, body_bold = _try_register_font(
        pdf, body_fam, wf / "times.ttf", wf / "timesbd.ttf"
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
            ok, bb = _try_register_font(pdf, body_fam, reg, bld)
            if ok:
                body_ok = True
                body_bold = bb
                break

    if not body_ok:
        p = _unicode_ttf_path()
        if p is not None:
            body_ok, body_bold = _try_register_font(
                pdf, body_fam, p, _dejavu_sans_bold_path(p)
            )

    if not title_ok and body_ok:
        title_fam = body_fam
        title_ok = True
    elif not body_ok and title_ok:
        body_fam = title_fam
        body_ok = True

    if not title_ok or not body_ok:
        return ("Helvetica", "Helvetica", False, False, False)
    return (title_fam, body_fam, True, body_bold, title_bold)


def _register_cover_fonts(
    pdf: Any, fallback_sans_bold: Path | None
) -> tuple[str | None, str | None, bool, bool]:
    """
    Century Gothic for cover lines; Palatino for author.
    Returns (cover_fam, author_fam, cover_use_style_b, author_has_bold).
    If only GOTHICB.ttf is registered as MsCover regular, cover_use_style_b is False (face is already bold).
    """
    wf = _windows_fonts_dir()
    ok, gothic_bold_loaded = _try_register_font(
        pdf, "MsCover", wf / "GOTHIC.TTF", wf / "GOTHICB.TTF"
    )
    cover_use_style_b = bool(ok and gothic_bold_loaded)
    if not ok and (wf / "GOTHICB.TTF").is_file():
        try:
            pdf.add_font("MsCover", "", str(wf / "GOTHICB.TTF"))
            ok = True
            cover_use_style_b = False
        except Exception as e:
            log.warning("Could not load GOTHICB as MsCover: %s", e)
    aok, author_bold = _try_register_font(pdf, "MsAuthor", wf / "pala.ttf", wf / "palab.ttf")
    if not ok and fallback_sans_bold is not None and fallback_sans_bold.is_file():
        try:
            pdf.add_font("MsCover", "", str(fallback_sans_bold))
            ok = True
            cover_use_style_b = False
        except Exception as e:
            log.warning("Could not load fallback cover font: %s", e)
    return (
        "MsCover" if ok else None,
        "MsAuthor" if aok else None,
        cover_use_style_b,
        author_bold,
    )


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
    left = txt(label_upper)
    right = txt(page_disp)
    w_left = pdf.get_string_width(left + " ")
    w_right = pdf.get_string_width(" " + right)
    dot_w = pdf.get_string_width(".")
    mid = max(0.0, printable_w_mm - w_left - w_right)
    n_dots = max(3, int(mid / dot_w) if dot_w > 0 else 3)
    dots = "." * n_dots
    lk = link_id if link_id is not None else ""
    pdf.cell(w=w_left, h=toc_line_h, text=left + " ", border=0, link=lk)
    pdf.cell(w=mid, h=toc_line_h, text=dots, border=0, link=lk)
    pdf.cell(w=w_right, h=toc_line_h, text=" " + right, border=0, align="R", link=lk)
    pdf.ln(_pt_to_mm(2))


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
    Expects dicts with keys title, content (as returned by Go internal chapters API).
    Cover page matches the reference Word file (Century Gothic / Verdana / Palatino); body 6×9".
    Inserts a Table of Contents after the cover: centered **TABLE OF CONTENTS**, dot leaders,
    Roman page labels for front matter (Dedication, Acknowledgment, About the Author), Arabic
    for body chapters (numbering restarts at Chapter 1). Optional ``toc_lines_out`` receives the
    same (label, page number string) pairs for the Word export.
    """
    from fpdf import FPDF

    sorted_rows = sorted(
        [c for c in chapters if isinstance(c, dict)],
        key=lambda x: int(x.get("chapter_number") or 0),
    )
    if not sorted_rows:
        raise ValueError("no chapters to render")

    pdf = FPDF(format=(_PAGE_W_MM, _PAGE_H_MM), unit="mm")
    pdf.set_auto_page_break(auto=True, margin=_MARGIN_MM)
    pdf.set_margins(_MARGIN_MM, _MARGIN_MM, _MARGIN_MM)

    title_fam, body_fam, use_unicode, body_has_bold, title_has_bold = (
        _register_manuscript_fonts(pdf)
    )
    sans_bold: Path | None = None
    p = _unicode_ttf_path()
    if p is not None:
        sb = _dejavu_sans_bold_path(p)
        if sb.is_file():
            sans_bold = sb
    cover_fam, author_fam, cover_use_b, author_bold_loaded = _register_cover_fonts(
        pdf, sans_bold
    )

    def txt(s: str) -> str:
        return s if use_unicode else _latin1_safe(s)

    body_line_h = _pt_to_mm(_BODY_PT) * _BODY_LINE_MULT
    para_gap = _pt_to_mm(_PARA_AFTER_PT)
    chapter_line_h = _pt_to_mm(_CHAPTER_PT * 1.2)
    toc_line_h = _pt_to_mm(_TOC_LINE_PT) * 1.2

    def _cover_font_main() -> None:
        if cover_fam:
            if cover_use_b:
                pdf.set_font(cover_fam, style="B", size=_COVER_MAIN_PT)
            else:
                pdf.set_font(cover_fam, size=_COVER_MAIN_PT)
        else:
            pdf.set_font(
                title_fam,
                style="B" if title_has_bold else "",
                size=_COVER_MAIN_PT,
            )

    def _cover_font_sub() -> None:
        if cover_fam:
            if cover_use_b:
                pdf.set_font(cover_fam, style="B", size=_COVER_SUB_PT)
            else:
                pdf.set_font(cover_fam, size=_COVER_SUB_PT)
        else:
            pdf.set_font(
                title_fam,
                style="B" if title_has_bold else "",
                size=_COVER_SUB_PT,
            )

    main_title = txt((book_title or "Manuscript").strip()[:500])
    sub = (subtitle or "").strip()
    sub_line = txt(_format_subtitle_line(sub)) if sub else ""
    auth = (author_name or "").strip()
    auth_line = txt(auth[:300]) if auth else ""

    pdf.add_page()
    pdf.ln(_pt_to_mm(28))
    pdf.set_text_color(*_COVER_TEXT_RGB)
    _cover_font_main()
    pdf.multi_cell(
        0,
        _pt_to_mm(_COVER_MAIN_PT * 1.2),
        main_title,
        align="C",
    )
    pdf.ln(_pt_to_mm(8))
    if sub_line:
        _cover_font_sub()
        pdf.multi_cell(
            0,
            _pt_to_mm(_COVER_SUB_PT * 1.15),
            sub_line,
            align="C",
        )
    pdf.ln(_pt_to_mm(18))
    if auth_line:
        if title_has_bold:
            pdf.set_font(title_fam, style="B", size=_COVER_BY_PT)
        else:
            pdf.set_font(title_fam, size=_COVER_BY_PT)
        pdf.multi_cell(0, _pt_to_mm(_COVER_BY_PT * 1.15), txt("By"), align="C")
        pdf.ln(_pt_to_mm(4))
        if author_fam:
            if author_bold_loaded:
                pdf.set_font(author_fam, style="B", size=_COVER_BY_PT)
            else:
                pdf.set_font(author_fam, size=_COVER_BY_PT)
        else:
            pdf.set_font(
                title_fam,
                style="B" if title_has_bold else "",
                size=_COVER_BY_PT,
            )
        pdf.multi_cell(
            0,
            _pt_to_mm(_COVER_BY_PT * 1.15),
            auth_line,
            align="C",
        )

    pdf.set_text_color(0, 0, 0)

    chapter_entries: list[tuple[str, str, str]] = []
    for row in sorted_rows:
        num = int(row.get("chapter_number") or 0)
        raw_title = str(row.get("title") or f"Chapter {num}").strip()[:500]
        body = txt(_markdownish_to_plain(str(row.get("content") or "")))
        if not body and not raw_title.strip():
            continue
        heading = txt(format_manuscript_chapter_heading(num, raw_title))
        chapter_entries.append((heading, heading, body))

    printable_w = _CONTENT_W_MM

    ded_raw = (dedication or "").strip()
    ded_body = txt(ded_raw) if ded_raw else txt(" ")

    def render_trade_toc(pdf2: Any, outline: list[Any]) -> None:
        """Filled in by fpdf2 after body pagination; ``outline`` from ``start_section`` calls."""
        if body_has_bold:
            pdf2.set_font(body_fam, style="B", size=_TOC_HEADING_PT)
        else:
            pdf2.set_font(body_fam, size=_TOC_HEADING_PT)
        pdf2.multi_cell(
            0,
            _pt_to_mm(_TOC_HEADING_PT * 1.2),
            txt("TABLE OF CONTENTS"),
            align="C",
        )
        pdf2.ln(_pt_to_mm(10))
        pdf2.set_font(body_fam, size=_TOC_LINE_PT)
        if not outline:
            return
        first_chapter_page = outline[3].page_number if len(outline) > 3 else outline[-1].page_number
        if toc_lines_out is not None:
            toc_lines_out.clear()
        for i, sec in enumerate(outline):
            if i < 3:
                disp = _int_to_roman_upper(sec.page_number)
            else:
                disp = str(sec.page_number - first_chapter_page + 1)
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

    # Page 2: reserved TOC (rendered at output); then front matter + chapters advance page numbers.
    pdf.add_page()
    pdf.insert_toc_placeholder(render_trade_toc, pages=1, allow_extra_pages=True)

    pdf.start_section("DEDICATION", level=0)
    if body_has_bold:
        pdf.set_font(body_fam, style="B", size=_CHAPTER_PT)
    else:
        pdf.set_font(body_fam, size=_CHAPTER_PT)
    pdf.multi_cell(0, chapter_line_h, txt("DEDICATION"), align="C")
    pdf.ln(_pt_to_mm(6))
    pdf.set_font(body_fam, size=_BODY_PT)
    for para in _split_paragraphs(ded_body) or [ded_body]:
        pdf.multi_cell(0, body_line_h, para, align="J")
        pdf.ln(para_gap)

    pdf.add_page()
    pdf.start_section("ACKNOWLEDGMENT", level=0)
    if body_has_bold:
        pdf.set_font(body_fam, style="B", size=_CHAPTER_PT)
    else:
        pdf.set_font(body_fam, size=_CHAPTER_PT)
    pdf.multi_cell(0, chapter_line_h, txt("ACKNOWLEDGMENT"), align="C")
    pdf.ln(_pt_to_mm(6))
    pdf.set_font(body_fam, size=_BODY_PT)
    ack = txt(
        "The author wishes to thank everyone who supported the creation of this book."
    )
    pdf.multi_cell(0, body_line_h, ack, align="J")
    pdf.ln(para_gap)

    pdf.add_page()
    pdf.start_section("ABOUT THE AUTHOR", level=0)
    if body_has_bold:
        pdf.set_font(body_fam, style="B", size=_CHAPTER_PT)
    else:
        pdf.set_font(body_fam, size=_CHAPTER_PT)
    pdf.multi_cell(0, chapter_line_h, txt("ABOUT THE AUTHOR"), align="C")
    pdf.ln(_pt_to_mm(6))
    pdf.set_font(body_fam, size=_BODY_PT)
    about_lines = []
    if auth_line:
        about_lines.append(auth_line)
    about_lines.append(
        txt(
            "This author writes with the goal of connecting with readers through honest, vivid storytelling."
        )
    )
    about_text = "\n\n".join(about_lines)
    for para in _split_paragraphs(about_text):
        pdf.multi_cell(0, body_line_h, para, align="J")
        pdf.ln(para_gap)

    for i, (_line, heading, body) in enumerate(chapter_entries):
        if i > 0:
            pdf.add_page()
        pdf.start_section(heading, level=0)
        if body_has_bold:
            pdf.set_font(body_fam, style="B", size=_CHAPTER_PT)
        else:
            pdf.set_font(body_fam, size=_CHAPTER_PT)
        pdf.multi_cell(0, chapter_line_h, heading, align="C")
        pdf.ln(_pt_to_mm(6))

        pdf.set_font(body_fam, size=_BODY_PT)
        if body:
            for para in _split_paragraphs(body):
                pdf.multi_cell(0, body_line_h, para, align="J")
                pdf.ln(para_gap)
        pdf.ln(_pt_to_mm(8))

    out = pdf.output()
    if isinstance(out, str):
        return out.encode("latin-1", errors="replace")
    return bytes(out)


def write_pdf_to_path(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def write_pdf_export_metadata(
    pdf_path: Path, *, author: str | None, title: str | None
) -> None:
    """Sidecar JSON for download filename (``Author - Title.pdf``). Written with the PDF."""
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
        "title": str(data.get("title") or ""),
    }
