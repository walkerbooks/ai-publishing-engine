"""Scrollable chat display: user messages on the right, bot on the left."""

import html
from typing import Any

import streamlit as st

# Max height for the message area so input stays visible
CHAT_MAX_HEIGHT_VH = 55


def _escape_and_br(text: str) -> str:
    return html.escape(text).replace("\n", "<br>")


# User: keep bubble. Assistant: no box — just text and content
_BUBBLE_USER = (
    "max-width: 75%; padding: 12px 16px; border-radius: 12px; font-size: 0.95rem; line-height: 1.5; "
    "background: #1e3a5f; color: #fff; border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.08);"
)
# No background, no border, no shadow — agent messages are just content
_BUBBLE_ASSISTANT = (
    "max-width: 75%; padding: 8px 0; font-size: 0.95rem; line-height: 1.5; "
    "background: transparent; color: inherit; border: none; box-shadow: none;"
)


def _render_video_message(content: str, videos: list[dict[str, Any]]) -> str:
    """Build HTML for an assistant message that includes video cards."""
    intro = f'<div style="margin-bottom: 12px; font-weight: 600;">{_escape_and_br(content)}</div>'
    cards = []
    for v in videos[:3]:
        title = _escape_and_br(v.get("title", ""))
        link = html.escape(v.get("link", "#"))
        thumb = html.escape(v.get("thumbnail_url", ""))
        thumb_html = f'<img src="{thumb}" style="max-width:100%; border-radius: 8px; margin-bottom: 4px; display: block;" />' if thumb else ""
        cards.append(
            f'<div style="display: inline-block; width: 30%; margin-right: 2%; vertical-align: top;">'
            f'<a href="{link}" target="_blank" rel="noopener" style="text-decoration: none;">{thumb_html}</a>'
            f'<a href="{link}" target="_blank" rel="noopener" style="font-size: 0.85rem; color: #2563eb; text-decoration: none;">{title}</a>'
            f"</div>"
        )
    videos_html = '<div style="margin-top: 8px;">' + "".join(cards) + "</div>"
    return intro + videos_html


def render_chat(messages: list[dict[str, Any]]) -> None:
    """
    Render chat messages in a scrollable container.
    User messages on the right, assistant on the left. Messages may include "videos" for video cards.
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
        content = msg.get("content", "")
        videos = msg.get("videos") or []

        if role == "user":
            content_esc = _escape_and_br(content)
            parts.append(
                f'<div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">'
                f'<div style="{_BUBBLE_USER}">{content_esc}</div></div>'
            )
        else:
            if videos:
                inner = _render_video_message(content, videos)
            else:
                inner = _escape_and_br(content)
            parts.append(
                f'<div style="display: flex; justify-content: flex-start; margin-bottom: 12px;">'
                f'<div style="{_BUBBLE_ASSISTANT}">{inner}</div></div>'
            )

    html_block = (
        f'<div style="max-height: {CHAT_MAX_HEIGHT_VH}vh; overflow-y: auto; padding: 12px 8px 12px 0;">'
        + "".join(parts) +
        "</div>"
    )
    st.markdown(html_block, unsafe_allow_html=True)
