"""Provider-agnostic LLM factory. Returns LangChain chat model from config."""

from langchain_core.language_models.chat_models import BaseChatModel

from api.config import get_settings


def get_llm(
    provider: str | None = None,
    streaming: bool = False,
    *,
    temperature: float | None = None,
) -> BaseChatModel:
    """
    Return a LangChain chat model for the given provider.
    If provider is None, uses settings.llm_provider.
    If temperature is None, uses 0.3 (general agents); structured intake uses a lower value.
    """
    settings = get_settings()
    p = (provider or settings.llm_provider).lower()
    temp = 0.3 if temperature is None else temperature

    if p == "openai":
        from langchain_openai import ChatOpenAI

        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not set")
        kwargs = {}
        if settings.openai_model.startswith("gpt-5"):
            kwargs["reasoning"] = {"effort": "minimal"}
        return ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=temp,
            streaming=streaming,
            **kwargs,
        )

    if p == "groq":
        from langchain_groq import ChatGroq

        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is not set")
        kwargs = {
            "model": settings.groq_model,
            "api_key": settings.groq_api_key,
            "temperature": temp,
        }
        # Streaming support depends on provider capabilities; if the Groq SDK
        # doesn't accept the `streaming` kwarg, we fall back to non-streaming.
        if streaming:
            try:
                return ChatGroq(**kwargs, streaming=True)
            except TypeError:
                pass
        return ChatGroq(**kwargs)

    raise ValueError(f"Unknown LLM provider: {provider}. Use 'openai' or 'groq'.")
