import streamlit as st


def main() -> None:
    st.set_page_config(page_title="Download · AI Publishing Engine", layout="wide")

    st.title("Download Exports")
    st.markdown(
        """
        This page will eventually list downloadable exports for each book:

        - DOCX (6×9, KDP-ready)
        - EPUB (Kindle)
        - PDF (print)

        Files will be produced by the deterministic formatting pipeline described in `learning.md`.
        """
    )

    st.info("No exports available yet. Formatting pipeline and backend integration are pending.")


if __name__ == "__main__":
    main()

