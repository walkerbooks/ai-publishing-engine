"""Chat page: intake conversation and BSO extraction."""

import sys
import uuid
from pathlib import Path

# Ensure project root on path for streamlit_app imports
_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import streamlit as st

from streamlit_app.components.chat_display import render_chat
from streamlit_app.utils.ai_client import chat as ai_chat


def _ensure_session_state() -> None:
    if "chat_messages" not in st.session_state:
        st.session_state["chat_messages"] = []
    if "session_id" not in st.session_state:
        st.session_state["session_id"] = str(uuid.uuid4())
    if "intake_complete" not in st.session_state:
        st.session_state["intake_complete"] = False
    if "book_id" not in st.session_state:
        st.session_state["book_id"] = None
    if "book_spec" not in st.session_state:
        st.session_state["book_spec"] = None


def main() -> None:
    st.set_page_config(page_title="Chat · AI Publishing Engine", layout="wide")
    _ensure_session_state()

    st.title("Chat → Book Specification (BSO)")
    st.markdown(
        "Describe the book you want to create. The assistant will ask a few questions "
        "and then capture a **Book Specification** when ready."
    )

    if st.session_state["intake_complete"]:
        st.success("✅ Book requirements captured! You can go to **Outline** to continue.")
        st.page_link("pages/2_outline.py", label="Go to Outline", icon="📋")
        if st.session_state.get("book_spec"):
            with st.expander("Captured book specification", expanded=False):
                st.json(st.session_state["book_spec"])
        if st.button("Start a new book"):
            st.session_state["chat_messages"] = []
            st.session_state["intake_complete"] = False
            st.session_state["book_id"] = None
            st.session_state["book_spec"] = None
            st.session_state["book_outline"] = None
            st.session_state["outline_error"] = None
            st.session_state["session_id"] = str(uuid.uuid4())
            st.rerun()
        return

    prompt = st.chat_input("Tell me about the book you want to create...")
    if prompt:
        st.session_state["chat_messages"].append({"role": "user", "content": prompt})

    # Scrollable chat: user messages on the right, bot on the left
    render_chat(st.session_state["chat_messages"])

    if prompt:
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                try:
                    history = [
                        {"role": m["role"], "content": m["content"]}
                        for m in st.session_state["chat_messages"][:-1]
                    ]
                    response = ai_chat(
                        message=prompt,
                        history=history,
                        session_id=st.session_state["session_id"],
                    )
                except Exception as e:
                    st.error(f"API error: {e}")
                    st.session_state["chat_messages"].pop()
                    return

            st.write(response["content"])
            st.session_state["chat_messages"].append({
                "role": "assistant",
                "content": response["content"],
            })

            if response.get("intake_complete") and response.get("book_spec"):
                st.session_state["intake_complete"] = True
                st.session_state["book_id"] = response.get("book_id")
                st.session_state["book_spec"] = response["book_spec"]
                st.rerun()


if __name__ == "__main__":
    main()
