import streamlit as st


def main() -> None:
    st.set_page_config(page_title="Outline · AI Publishing Engine", layout="wide")

    st.title("Outline")
    st.markdown(
        """
        This page will display the **book outline** generated from the BSO:

        - Chapter titles
        - Subtopics per chapter
        - Word allocation per chapter

        For now, this is a placeholder until the outline agent and database wiring are implemented.
        """
    )

    st.info("Outline data is not yet loaded from the backend or AI API.")


if __name__ == "__main__":
    main()

