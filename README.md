## AI Publishing Engine — Python AI Repo

This repo is the **AI side** of the AI Publishing Engine described in `learning.md`. It contains:

- **Streamlit UI** (user-facing app)
- **FastAPI AI API** (agents, LLM calls, sync state — to be implemented)

Backend (Go API, Stripe, auth, etc.) lives in a **separate repo** as per the architecture in `learning.md`.

---

### 1. Project Structure

Planned structure for this repo:

- `learning.md` — Product and architecture spec (source of truth)
- `streamlit_app/` — Streamlit UI
  - `app.py` — main entrypoint
  - `pages/` — multi-step flow pages (chat, outline, download)
- `api/` — FastAPI app
  - `main.py` — FastAPI entrypoint and initial LLM test endpoint

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

Create a `.env` file in the repo root (or set system env vars) with:

```bash
OPENAI_API_KEY=your-openai-key
```

The FastAPI app uses `OPENAI_API_KEY` for the initial test endpoint.

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

### 4. Current Status (Phase 0)

- `learning.md` captures the full system design.
- Minimal **Streamlit shell** with placeholder pages is set up.
- Minimal **FastAPI app** is set up with:
  - `/health` — health check
  - `/llm/test` — makes a small OpenAI call to prove keys + stack

Next phases will implement the multi-agent flow described in `learning.md` (BSO extraction, supervisor, outline agent, preview, full-book generation, sync state, and formatting pipeline).

