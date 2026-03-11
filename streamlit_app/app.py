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

        - **Chat**: Capture natural-language requirements and move toward a Book Specification Object (BSO).
        - **Outline**: View and (later) refine the automatically generated outline.
        - **Download**: (Later) access generated exports such as DOCX, EPUB, and PDF.

        The full multi-agent flow (supervisor, outline agent, preview agent, full-book generation, sync state)
        will be implemented step by step on top of this shell.
        """
    )

    st.info(
        "Phase 0: repository scaffolded. Next steps: implement Chat → BSO extraction via the FastAPI AI API."
    )


if __name__ == "__main__":
    main()

