## WalkerBook — Python AI Repo

This repo is the **AI side** of WalkerBook described in `learning.md`. It contains:

- **Next.js frontend** (`frontend/`) — App Router UI (chat, outline, preview, full book placeholders)
- **FastAPI AI API** (agents, LLM calls, LangGraph pipeline)

Backend (Go API, Stripe, auth, etc.) lives in a **separate repo** as per the architecture in `learning.md`.

---

### 1. Project Structure

- `learning.md` — Product and architecture spec (source of truth)
- `frontend/` — Next.js 14+ app (see `frontend/README.md`)
- `api/` — FastAPI app
  - `main.py` — FastAPI entrypoint, routers
  - `state/` — `schema.py` (BookSpecification, BookOutline, etc.)
  - `llm/` — `factory.py` (provider-agnostic `get_llm(provider)`)
  - `agents/` — LangGraph pipeline, intake/outline/preview agents, prompts
  - `services/` — `bso_validator.py`, `youtube.py`, etc.
  - `api/` — `chat.py`, `outline.py`, `preview.py`, `videos.py`

---

### 2. Setup

1. **Create and activate a virtualenv** (recommended):

```bash
python -m venv .venv
.venv\Scripts\activate  # on Windows
```

2. **Install Python dependencies**:

```bash
pip install -r requirements.txt
```

3. **Environment variables**

Create a `.env` file in the repo root (or set system env vars). Example:

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=your-openai-key
# Optional: Groq, LangSmith, YouTube API for onboarding videos, etc.
```

4. **Frontend** — see `frontend/README.md` (`AI_API_URL` for the Next.js proxy).

---

### 3. Running the Apps

**Run Next.js UI:**

```bash
cd frontend
npm install
npm run dev
```

**Run FastAPI AI API (development):**

```bash
uvicorn api.main:app --reload
```

FastAPI defaults to `http://127.0.0.1:8000`. Point `frontend/.env` `AI_API_URL` at that base URL.

---

### 4. Current Status (Phase 3 — Preview)

- **Chat** → BSO via `POST /api/chat`
- **Outline** → `POST /api/outline`
- **Preview** → `POST /api/preview`
- **Videos** → `GET /api/videos` (onboarding)
- **Next.js** replaces the former Streamlit UI; state persists in the browser until you wire the Go backend.

Next: Go API (guest sessions, books), Stripe, full-book generation, formatting pipeline.
