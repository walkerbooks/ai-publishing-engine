"""Download page: DOCX, EPUB, PDF exports (Phase 5)."""

import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st


def main() -> None:
    st.set_page_config(page_title="Download · AI Publishing Engine", layout="wide")

    st.title("Download Exports")
    st.markdown(
        """
        This page will list downloadable exports for each book:

        - DOCX (6×9, KDP-ready)
        - EPUB (Kindle)
        - PDF (print)

        Files are produced by the formatting pipeline (Phase 5).
        """
    )

    st.info("No exports available yet. Formatting pipeline and backend integration are pending.")


if __name__ == "__main__":
    main()
