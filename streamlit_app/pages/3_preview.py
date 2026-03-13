"""Preview page: 6–8 page sample (intro + first chapter), then Buy full book."""

import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st

from streamlit_app.utils.ai_client import preview as fetch_preview


def _ensure_session_state() -> None:
    if "book_spec" not in st.session_state:
        st.session_state["book_spec"] = None
    if "book_outline" not in st.session_state:
        st.session_state["book_outline"] = None
    if "preview_content" not in st.session_state:
        st.session_state["preview_content"] = None
    if "preview_error" not in st.session_state:
        st.session_state["preview_error"] = None


def main() -> None:
    st.set_page_config(page_title="Preview · AI Publishing Engine", layout="wide")
    _ensure_session_state()

    st.title("Preview")
    st.markdown(
        "Read a 6–8 page sample of your book (intro + first chapter). "
        "When you're ready, use **Buy full book** to get the complete manuscript."
    )

    book_spec = st.session_state.get("book_spec")
    book_outline = st.session_state.get("book_outline")

    if not book_spec:
        st.warning("Complete **Chat** first to set your book specification.")
        st.page_link("pages/1_chat.py", label="Go to Chat", icon="💬")
        return
    if not book_outline:
        st.warning("Generate an **Outline** before the preview.")
        st.page_link("pages/2_outline.py", label="Go to Outline", icon="📋")
        return

    preview_content = st.session_state.get("preview_content")
    preview_error = st.session_state.get("preview_error")

    if preview_content is None and preview_error is None:
        if st.button("Generate preview"):
            with st.spinner("Writing your preview (intro + first chapter)…"):
                try:
                    result = fetch_preview(book_spec, book_outline)
                    st.session_state["preview_content"] = result.get("preview_content", "")
                    st.session_state["preview_error"] = None
                    st.rerun()
                except Exception as e:
                    st.session_state["preview_error"] = str(e)
                    st.rerun()
        return

    if preview_error:
        st.error(f"Preview failed: {preview_error}")
        if st.button("Retry preview"):
            st.session_state["preview_error"] = None
            st.rerun()
        return

    # Show preview in a scrollable area
    st.divider()
    with st.container():
        st.markdown(preview_content)
    st.divider()

    # Buy full book (placeholder until Stripe/Go backend)
    st.subheader("Buy full book")
    st.caption(
        "Payment and full manuscript generation will be wired in the next phase "
        "(Stripe checkout via Go backend)."
    )
    if st.button("Buy full book", type="primary", use_container_width=True):
        st.info(
            "Stripe checkout is not connected yet. "
            "When the Go backend is ready, this will open checkout; after payment, "
            "the full book will be generated."
        )


if __name__ == "__main__":
    main()
