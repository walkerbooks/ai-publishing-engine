"""Outline page: show chapter outline from BSO; continue to preview."""

import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st

from streamlit_app.utils.ai_client import outline as fetch_outline


def _ensure_session_state() -> None:
    if "book_spec" not in st.session_state:
        st.session_state["book_spec"] = None
    if "book_outline" not in st.session_state:
        st.session_state["book_outline"] = None
    if "outline_error" not in st.session_state:
        st.session_state["outline_error"] = None


def main() -> None:
    st.set_page_config(page_title="Outline · AI Publishing Engine", layout="wide")
    _ensure_session_state()

    st.title("Outline")
    st.markdown(
        "Your book outline: chapter titles, subtopics, and word allocation. "
        "Generated from your book specification."
    )

    book_spec = st.session_state.get("book_spec")
    if not book_spec:
        st.warning("Complete the **Chat** step first to capture your book specification.")
        st.page_link("pages/1_chat.py", label="Go to Chat", icon="💬")
        return

    book_outline = st.session_state.get("book_outline")
    outline_error = st.session_state.get("outline_error")

    if book_outline is None and outline_error is None:
        if st.button("Generate outline"):
            with st.spinner("Generating outline..."):
                try:
                    result = fetch_outline(book_spec)
                    st.session_state["book_outline"] = result
                    st.session_state["outline_error"] = None
                    st.rerun()
                except Exception as e:
                    st.session_state["outline_error"] = str(e)
                    st.rerun()
        return

    if outline_error:
        st.error(f"Failed to generate outline: {outline_error}")
        if st.button("Retry"):
            st.session_state["outline_error"] = None
            st.rerun()
        return

    # Display outline
    o = book_outline
    st.subheader(o.get("book_title", "Book"))
    if o.get("subtitle"):
        st.caption(o["subtitle"])
    st.metric("Total words (target)", f"{o.get('total_word_target', 0):,}")
    st.metric("Estimated pages", o.get("estimated_pages", 0))

    st.divider()
    st.write("### Chapters")
    for ch in o.get("chapters", []):
        with st.expander(f"Ch{ch['chapter_number']}: {ch['title']} — {ch.get('word_target', 0):,} words"):
            for sub in ch.get("subtopics", []):
                st.markdown(f"- {sub}")

    st.divider()
    st.success("Outline ready. Preview and payment will be available in a later phase.")
    if st.button("Continue to preview (Phase 3)"):
        st.info("Preview page coming in Phase 3.")


if __name__ == "__main__":
    main()
