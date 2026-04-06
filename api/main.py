import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import openai

from api.api.chat import router as chat_router
from api.api.chat_unified import router as chat_unified_router
from api.api.exports_download import router as exports_download_router
from api.api.internal_generate import router as internal_generate_router
from api.api.outline import router as outline_router
from api.api.preview import router as preview_router
from api.api.videos import router as videos_router
from api.tracing import init_langsmith

# Load repo-root .env even when cwd is `api/` or elsewhere
_root_env = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(_root_env if _root_env.is_file() else None)
load_dotenv()

app = FastAPI(title="WalkerBook - AI API")
app.include_router(chat_router)
app.include_router(chat_unified_router)
app.include_router(outline_router)
app.include_router(preview_router)
app.include_router(videos_router)
app.include_router(internal_generate_router)
app.include_router(exports_download_router)


class TestChatRequest(BaseModel):
    message: str = "Say hello. This is a test of the WalkerBook AI stack."


class TestChatResponse(BaseModel):
    reply: str
    model: Optional[str] = None


@app.on_event("startup")
def on_startup() -> None:
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        openai.api_key = api_key
    init_langsmith()


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/llm/test", response_model=TestChatResponse)
async def llm_test(payload: TestChatRequest) -> TestChatResponse:
    if not openai.api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured. Set it in your environment or .env file.",
        )

    try:
        completion = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a concise assistant for test calls."},
                {"role": "user", "content": payload.message},
            ],
            max_tokens=64,
        )
    except Exception as exc:  # minimal error handling for Phase 0
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    choice = completion.choices[0]
    reply_text = choice.message["content"]
    used_model = completion.model

    return TestChatResponse(reply=reply_text, model=used_model)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, reload=True)

