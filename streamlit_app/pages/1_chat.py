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
from streamlit_app.utils.ai_client import chat as ai_chat, videos as fetch_videos


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
    if "pending_prompt" not in st.session_state:
        st.session_state["pending_prompt"] = None
    if "user_name" not in st.session_state:
        st.session_state["user_name"] = None


WELCOME_TEXT = (
    "Hello, I'm Alex from Smith Book, nice to meet you!! "
    "Can I show you a new way to make a LOT of money that you may not have known about before you got here?"
)
WELCOME_OPTIONS = ["YES!!", "YOU SURE CAN!", "I ALREADY KNOW LET'S CREATE!"]
# Options that trigger the name → greeting → videos flow
WELCOME_OPTIONS_ASK_NAME = ["YES!!", "YOU SURE CAN!"]
VIDEO_BLOCK_HEADING = (
    "Look at this TON of videos being published on YouTube "
    "teaching you how to make a LOT OF MONEY by selling ebooks on Amazon..."
)


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
            st.session_state["preview_content"] = None
            st.session_state["preview_error"] = None
            st.session_state["session_id"] = str(uuid.uuid4())
            st.session_state["pending_prompt"] = None
            st.session_state["user_name"] = None
            st.rerun()
        return

    prompt = st.session_state.get("pending_prompt")
    if not prompt:
        prompt = st.chat_input("Tell me about the book you want to create...")
    if prompt:
        if not st.session_state.get("pending_prompt"):
            st.session_state["chat_messages"].append({"role": "user", "content": prompt})
        else:
            st.session_state["pending_prompt"] = None

    # Welcome screen: no messages yet → show Alex greeting and option buttons
    if not st.session_state["chat_messages"]:
        with st.chat_message("assistant"):
            st.markdown(WELCOME_TEXT)
        st.markdown("**Choose an option:**")
        cols = st.columns(3)
        for i, option in enumerate(WELCOME_OPTIONS):
            with cols[i]:
                if st.button(option, key=f"welcome_opt_{i}", use_container_width=True):
                    st.session_state["chat_messages"].append({"role": "user", "content": option})
                    st.session_state["pending_prompt"] = option
                    st.rerun()
        return

    # Inject video block as one assistant message (once) after name + greeting
    messages = st.session_state["chat_messages"]
    has_video_message = any(m.get("videos") for m in messages)
    if (
        len(messages) == 4
        and messages[0].get("role") == "user"
        and messages[0].get("content") in WELCOME_OPTIONS_ASK_NAME
        and not has_video_message
    ):
        try:
            data = fetch_videos(q="make money selling ebooks on Amazon KDP", max_results=3)
            video_list = data.get("videos") or []
        except Exception:
            video_list = []
        st.session_state["chat_messages"].append({
            "role": "assistant",
            "content": VIDEO_BLOCK_HEADING,
            "videos": video_list[:3],
        })
        st.rerun()

    # Scrollable chat: user messages on the right, bot on the left (videos rendered inside chat)
    render_chat(st.session_state["chat_messages"])

    if prompt:
        messages = st.session_state["chat_messages"]
        # Capture user name when they just sent it (3 messages: user option, assistant ask name, user name)
        if (
            len(messages) == 3
            and messages[0].get("content") in WELCOME_OPTIONS_ASK_NAME
            and messages[1].get("role") == "assistant"
            and messages[2].get("role") == "user"
        ):
            st.session_state["user_name"] = (messages[2].get("content") or "").strip() or None

        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                try:
                    history = [
                        {"role": m["role"], "content": m.get("content", "")}
                        for m in st.session_state["chat_messages"][:-1]
                    ]
                    response = ai_chat(
                        message=prompt,
                        history=history,
                        session_id=st.session_state["session_id"],
                    )
                except Exception as e:
                    st.error(f"API error: {e}")
                    if not st.session_state.get("pending_prompt"):
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
