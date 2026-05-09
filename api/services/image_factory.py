"""Factory for OpenAI Images API client (separate from LangChain text models)."""

from openai import OpenAI

from api.config import get_settings


def get_image_client() -> OpenAI:
    """
    Return OpenAI SDK client for image generation.
    This intentionally stays separate from LangChain's text/agent stack.
    """
    settings = get_settings()
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=settings.openai_api_key)

