import sys
from pathlib import Path

# Ensure project root is on path so "streamlit_app" and "api" imports work
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st


st.set_page_config(
    page_title="AI Publishing Engine",
    page_icon="📚",
    layout="wide",
)


def main() -> None:
    st.title("AI Publishing Engine")
    st.markdown(
        """
        This is the **AI repo** UI for the AI Publishing Engine described in `learning.md`.

        Use the pages in the sidebar to walk through the flow:

        - **Chat**: Capture requirements and get a Book Specification (BSO).
        - **Outline**: Generate and view the chapter outline.
        - **Preview**: Read a 6–8 page sample, then **Buy full book**.
        - **Download**: Get DOCX, EPUB, and PDF (after formatting pipeline).
        """
    )

    st.info(
        "Phase 3: Chat → BSO → Outline → Preview (intro + first chapter). "
        "Buy full book and Download will connect to Stripe and the formatting pipeline next."
    )


if __name__ == "__main__":
    main()

