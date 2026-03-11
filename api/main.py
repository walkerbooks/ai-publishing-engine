import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import openai


load_dotenv()

app = FastAPI(title="AI Publishing Engine - AI API")


class TestChatRequest(BaseModel):
    message: str = "Say hello. This is a test of the AI Publishing Engine stack."


class TestChatResponse(BaseModel):
    reply: str
    model: Optional[str] = None


@app.on_event("startup")
def configure_openai() -> None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        # We do not fail hard here; instead, the endpoint will report misconfiguration.
        return
    openai.api_key = api_key


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

