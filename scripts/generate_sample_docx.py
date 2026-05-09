#!/usr/bin/env python3
"""
Build a review .docx with rich dummy content so layout (cover, copyright, front
matter, TOC, chapter headings, body indents/justification) is easy to inspect.

Run from the repository root:

    python scripts/generate_sample_docx.py

Default output: tmp/format_review_manuscript.docx

Builds the PDF once: fills TOC page numbers for the DOCX and writes the PDF
(by default <docx-stem>.pdf beside the .docx, or a path from --pdf).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from api.services.chapters_docx import (  # noqa: E402
    build_manuscript_docx_bytes,
    write_docx_to_path,
)
from api.services.chapters_pdf import build_manuscript_pdf_bytes  # noqa: E402

# ---------------------------------------------------------------------------
# Dummy metadata (stress cover line-wrap, By/author block, etc.)
# ---------------------------------------------------------------------------

BOOK_TITLE = (
    "The Beach Ain't All Surf and Sand — "
    "Stories from the Boardwalk at the End of the Season"
)
SUBTITLE = "A Novel in Twelve Waves"
AUTHOR = "Umer Naeem"

DEDICATION = """For readers who like margins wide enough to breathe in,
and for editors who still argue about one space or two after a period.

Second paragraph on the dedication page: may the tide bring back what you thought was lost."""

# chapter_number, title, markdown-ish body (exercises _markdownish_to_plain + headings strip)
CHAPTERS: list[dict] = [
    {
        "chapter_number": 1,
        "title": "Morning Glass and the First Lie of the Day",
        "content": """# Chapter 1: Morning Glass and the First Lie of the Day

The pier smelled of **fry oil** and *sunscreen* that had given up. Mara tightened the strap on her sandals and watched a gull argue with a trash bag.

She said aloud, to no one, "If I walk to the jetty and back before nine, I won't think about the email." The boardwalk answered with a loose nail and a thump of bass from a closed arcade.

Three short paragraphs test the **25.7 pt before / 8 pt after** body rhythm. Here is the third: the horizon was a ruled line someone had drawn with a dull pencil—straight enough to pretend it meant something.

A fourth block after a blank line tests separation.

> Block-style emphasis survives as plain quote styling in the pipeline.

Final graf: `code ticks` become plain text; lists below:

- First bullet from markdown
- Second bullet with enough words to justify across the measure and show hyphenation behavior in Times at eleven point.""",
    },
    {
        "chapter_number": 2,
        "title": "High Tide, Low Patience",
        "content": """## Chapter 2: High Tide, Low Patience

Chapter two opens without repeating the stripped heading line when it matches.

""" + "\n\n".join(
            [
                (
                    f"Paragraph {n}: Lorem ipsum is tired; imagine instead a paragraph about "
                    f"heat shimmer, rental bikes with bent spokes, and the way receipts "
                    f"curl in your pocket. Enough text here to fill several lines in a 6×9 "
                    f"trade block with side indents so **justification** is obvious."
                )
                for n in range(1, 9)
            ]
        ),
    },
    {
        "chapter_number": 3,
        "title": "The Week the Lifeguards Quit",
        "content": """CHAPTER 3 THE WEEK THE LIFEGUARDS QUIT

When the stored title is already shouty caps, the second line of the chapter heading still renders from the cleaned title logic.

Two paragraphs only.

Second paragraph: shorter.""",
    },
    {
        "chapter_number": 4,
        "title": "Sand in the Keyboard",
        "content": (
            "Single long paragraph with no double-newline splits — "
            + ("More words follow to justify lines across the measure. " * 35)
            + "End."
        ),
    },
    {
        "chapter_number": 5,
        "title": "Epilogue: Low Tide",
        "content": """## Chapter 5: Epilogue: Low Tide

Closing beat. One paragraph.

The end (until you change the dummy data).""",
    },
]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Write a format-review .docx using build_manuscript_docx_bytes."
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=_ROOT / "tmp" / "format_review_manuscript.docx",
        help="Output .docx path",
    )
    parser.add_argument(
        "--pdf",
        type=Path,
        default=None,
        metavar="PATH",
        help="Output .pdf path (default: same directory/stem as --output with .pdf)",
    )
    args = parser.parse_args()
    out: Path = args.output
    out.parent.mkdir(parents=True, exist_ok=True)
    pdf_out: Path = args.pdf if args.pdf is not None else out.with_suffix(".pdf")
    pdf_out.parent.mkdir(parents=True, exist_ok=True)

    toc_lines: list[tuple[str, str]] = []
    pdf_bytes = build_manuscript_pdf_bytes(
        CHAPTERS,
        BOOK_TITLE,
        subtitle=SUBTITLE,
        author_name=AUTHOR,
        dedication=DEDICATION,
        toc_lines_out=toc_lines,
    )
    pdf_out.write_bytes(pdf_bytes)

    docx_bytes = build_manuscript_docx_bytes(
        CHAPTERS,
        BOOK_TITLE,
        subtitle=SUBTITLE,
        author_name=AUTHOR,
        dedication=DEDICATION,
        toc_lines=toc_lines,
    )
    write_docx_to_path(out, docx_bytes)

    print(f"Wrote {out} ({len(docx_bytes):,} bytes)")
    print(f"Wrote {pdf_out} ({len(pdf_bytes):,} bytes)")
    print(f"TOC rows: {len(toc_lines)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
