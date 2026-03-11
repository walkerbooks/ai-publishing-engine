import streamlit as st


def main() -> None:
    st.set_page_config(page_title="Chat · AI Publishing Engine", layout="wide")

    st.title("Chat → Book Specification (BSO)")
    st.markdown(
        """
        This page will host the **chat intake flow**:

        - User describes the desired book in natural language.
        - The system extracts a **Book Specification Object (BSO)**.
        - The confirmed BSO is then saved (via the Backend in the full system).

        For now, this is just a placeholder UI shell.
        """
    )

    st.subheader("Chat (placeholder)")
    st.write("This is where the chat interface will live.")

    user_message = st.text_area("Describe the book you want to create", height=150)

    if st.button("Send (no-op for now)", disabled=not user_message.strip()):
        st.warning(
            "Chat backend not wired yet. Next steps: connect this to the FastAPI AI API for BSO extraction."
        )


if __name__ == "__main__":
    main()

