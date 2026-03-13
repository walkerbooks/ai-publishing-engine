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
  - `agents/` — `graph.py` (LangGraph pipeline), `graph_state.py`, intake/outline/preview agents, `supervisor.py`, `prompts/`
  - `services/` — `bso_validator.py`
  - `tracing/` — `langsmith_setup.py` (LangSmith init + `graph_config()` for run_name/tags)
  - `api/` — `chat.py`, `outline.py`, `preview.py`

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

# Optional: LangSmith tracing (set LANGSMITH_API_KEY to enable)
# LANGSMITH_API_KEY=ls__...
# LANGSMITH_PROJECT=ebook-engine
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

**LangGraph & LangSmith:** All chat, outline, and preview requests go through a single LangGraph pipeline (`api/agents/graph.py`): supervisor → intake | outline | preview → end. Each node delegates to the existing agents. At startup, `init_langsmith()` sets `LANGCHAIN_TRACING_V2` and `LANGCHAIN_API_KEY` when `LANGSMITH_API_KEY` is set, so every graph invocation (and thus every LLM call) is traced in LangSmith with run_name and tags (e.g. `chat`, `stage:intake`). Checkpointer is `MemorySaver` for now; swap to `AsyncPostgresSaver` for production.

Next: Phase 4 — Stripe checkout, webhook, full-book generation (Celery).

