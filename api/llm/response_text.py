"""Normalize provider responses to plain text."""


def response_text(response: object) -> str:
    """Extract text from common LangChain/OpenAI response shapes."""
    content = response.content if hasattr(response, "content") else response
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                s = item.strip()
                if s:
                    parts.append(s)
                continue
            if isinstance(item, dict):
                txt = item.get("text")
                if isinstance(txt, str) and txt.strip():
                    parts.append(txt.strip())
                    continue
                nested = item.get("content")
                if isinstance(nested, str) and nested.strip():
                    parts.append(nested.strip())
                    continue
        if parts:
            return "\n".join(parts)
    return str(content)
