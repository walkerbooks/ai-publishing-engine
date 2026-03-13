## AI Publishing Engine — Python AI Repo

This repo is the **AI side** of the AI Publishing Engine described in `learning.md`. It contains:

- **Streamlit UI** (user-facing app)
- **FastAPI AI API** (agents, LLM calls, sync state)

Backend (Go API, Stripe, auth, etc.) lives in a **separate repo** as per the architecture in `learning.md`.

---

### 1. Project Structure

- `learning.md` — Product and architecture spec (source of truth)
- `streamlit_app/` — Streamlit UI
  - `app.py` — main entrypoint
  - `pages/` — 1_chat, 2_outline, 3_preview, 4_download
  - `utils/` — `ai_client` (HTTP client for AI API)
- `api/` — FastAPI app
  - `main.py` — FastAPI entrypoint, includes chat, outline, preview routers
  - `state/` — `schema.py` (BookSpecification, BookOutline, etc.)
  - `llm/` — `factory.py` (provider-agnostic `get_llm(provider)`)
  - `agents/` — `intake_agent.py`, `outline_agent.py`, `preview_agent.py`, `supervisor.py`, `prompts.py`
  - `services/` — `bso_validator.py`
  - `api/` — `chat.py`, `outline.py`, `preview.py` (POST /api/preview)

---

### 2. Setup

1. **Create and activate a virtualenv** (recommended):

```bash
python -m venv .venv
.venv\Scripts\activate  # on Windows
```

2. **Install dependencies**:

```bash
pip install -r requirements.txt
```

3. **Environment variables**

Create a `.env` file in the repo root (or set system env vars). Example:

```bash
# Required for intake (default provider)
LLM_PROVIDER=openai
OPENAI_API_KEY=your-openai-key

# Optional: Groq (set LLM_PROVIDER=groq and GROQ_API_KEY)
# GROQ_API_KEY=...

# Optional: AI API URL used by Streamlit (default http://localhost:8000)
# AI_API_URL=http://localhost:8000
```

---

### 3. Running the Apps

**Run Streamlit UI:**

```bash
streamlit run streamlit_app/app.py
```

**Run FastAPI AI API (development):**

```bash
uvicorn api.main:app --reload
```

FastAPI will default to `http://127.0.0.1:8000`.

---

### 4. Current Status (Phase 3 — Preview)

- **Phase 1:** Intake agent, POST /api/chat, Streamlit Chat → BSO in session state.
- **Phase 2:** Supervisor, outline agent, POST /api/outline, Streamlit Outline page.
- **Preview agent** (`api/agents/preview_agent.py`): BSO + outline → 6–8 page markdown (intro + first chapter).
- **POST /api/preview**: accepts `book_spec` and `book_outline`, returns `preview_content` (markdown).
- **Streamlit Preview page** (3_preview): requires BSO + outline; "Generate preview" then shows sample; **Buy full book** button (placeholder until Stripe/Go backend).
- **Download page** moved to 4_download.

Next: Phase 4 — Stripe checkout, webhook, full-book generation (Celery).

