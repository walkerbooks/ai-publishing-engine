"""Scrollable chat display: user messages on the right, bot on the left."""

import html

import streamlit as st

# Max height for the message area so input stays visible
CHAT_MAX_HEIGHT_VH = 55


def _escape_and_br(text: str) -> str:
    return html.escape(text).replace("\n", "<br>")


def render_chat(messages: list[dict[str, str]]) -> None:
    """
    Render chat messages in a scrollable container.
    User messages appear on the right, assistant on the left.
    """
    if not messages:
        st.markdown(
            "<div style='max-height: 50vh; overflow-y: auto; padding: 1rem; "
            "color: #666; text-align: center;'>Start the conversation below.</div>",
            unsafe_allow_html=True,
        )
        return

    parts = []
    for msg in messages:
        role = msg.get("role", "user")
        content = _escape_and_br(msg.get("content", ""))
        if role == "user":
            parts.append(
                f'<div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">'
                f'<div style="max-width: 75%; background: #1e3a5f; color: #fff; padding: 12px 16px; '
                f'border-radius: 18px 18px 4px 18px; font-size: 0.95rem; line-height: 1.5;">{content}</div></div>'
            )
        else:
            parts.append(
                f'<div style="display: flex; justify-content: flex-start; margin-bottom: 12px;">'
                f'<div style="max-width: 75%; background: #f0f2f6; color: #1f2937; padding: 12px 16px; '
                f'border-radius: 18px 18px 18px 4px; font-size: 0.95rem; line-height: 1.5;">{content}</div></div>'
            )

    html_block = (
        f'<div style="max-height: {CHAT_MAX_HEIGHT_VH}vh; overflow-y: auto; padding: 12px 8px 12px 0;">'
        + "".join(parts) +
        "</div>"
    )
    st.markdown(html_block, unsafe_allow_html=True)
