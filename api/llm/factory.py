"""Provider-agnostic LLM factory. Returns LangChain chat model from config."""

from langchain_core.language_models.chat_models import BaseChatModel

from api.config import get_settings


def get_llm(provider: str | None = None) -> BaseChatModel:
    """
    Return a LangChain chat model for the given provider.
    If provider is None, uses settings.llm_provider.
    """
    settings = get_settings()
    p = (provider or settings.llm_provider).lower()

    if p == "openai":
        from langchain_openai import ChatOpenAI

        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not set")
        return ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=0.3,
        )

    if p == "groq":
        from langchain_groq import ChatGroq

        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is not set")
        return ChatGroq(
            model=settings.groq_model,
            api_key=settings.groq_api_key,
            temperature=0.3,
        )

    raise ValueError(f"Unknown LLM provider: {provider}. Use 'openai' or 'groq'.")
