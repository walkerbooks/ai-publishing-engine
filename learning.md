# AI Publishing Engine — End-to-End Plan & Tech Stack

This document consolidates the full vision, architecture, tech stack, and implementation plan for the AI Publishing Engine (multi-agent, stateful, monetized book generation system).

---

## 1. What We're Building

**We are not building a chatbot.** We are building an **AI Publishing Engine** that:

| Capability | Description |
|------------|-------------|
| **Collects** | Structured book requirements from natural-language chat |
| **Preview** | Generates a 6–8 page preview (sample chapter + partial + intro) |
| **Payment** | Handles payment (Stripe) before full manuscript |
| **Full manuscript** | Generates a 120–150 page full book (40k–60k words) |
| **Formats** | Outputs KDP-ready files: EPUB (Kindle), PDF (print), DOCX |

**Characteristics:**

- **Agentic** — Multiple specialized agents orchestrated by a master
- **Stateful** — Sync state and chapter summaries keep the book coherent
- **Long-context** — Hierarchical memory; never hold full manuscript in one LLM call
- **Multi-stage** — Chat → Outline → Preview → Payment → Full book → Export
- **Formatting-sensitive** — Programmatic formatting (no LLM for margins/layout)
- **Monetized** — Preview free; full book behind payment

---

## 2. High-Level System Architecture

### Layer 1 — Chat Layer (User Interaction)

- User describes the book in natural language (e.g. *"I want a 150-page self-help book for teenagers about productivity"*).
- We **do not** generate the book immediately. We **extract** structured requirements into a **Book Specification Object (BSO)**.

**BSO example:**

```json
{
  "genre": "Self Help",
  "audience": "Teenagers",
  "tone": "Motivational",
  "length": 150,
  "format": "Kindle + Paperback",
  "size": "6x9",
  "language": "English"
}
```

### Layer 2 — Supervisor Agent (Master Agent)

The **Supervisor** is the **master agent**. It:

- Validates completeness of requirements
- Asks clarifying questions when needed
- Creates the outline plan, chapter structure, and word distribution
- Decides: Preview mode vs Full mode
- **Orchestrates** — Decides which agent runs next; does not write chapters or format

**Think of it as:** Orchestrator + Planner. Routing and planning only; no long-form generation.

### Layer 3 — Generation Agents (Workers)

| Agent | Responsibility |
|-------|----------------|
| **Outline Agent** | Book outline, chapter titles, subtopics, word allocation per chapter |
| **Preview Agent** | 6–8 page preview: 1 full sample chapter + 1 partial + intro |
| **Full Book Agent** | Generates chapters **one by one** after payment; never 150 pages in one call |
| **Summarizer** | After each chapter: 200–300 word summary for continuity |
| **Sync State Updater** | Updates narrative arc, key facts, open threads, last chapter beat |
| **Formatter Pipeline** | Markdown → DOCX / EPUB / PDF (programmatic; no LLM) |

**Critical rule:** Never generate the whole book in a single LLM call.

---

## 3. Agentic Flow (Master + Workers)

```
User input → Master (Supervisor) Agent
                  │
                  ├─► Validate / clarify → maybe back to user
                  ├─► Outline Agent      → outline + chapter plan
                  ├─► Preview Agent      → 6–8 page sample (pre payment)
                  │       │
                  │       └─► [Payment gate]
                  │
                  └─► Full-book path (after payment):
                           Chapter Generator Agent (per chapter)
                                    │
                           Summarizer Agent (per chapter)
                                    │
                           Sync State Updater
                                    │
                           … repeat for N chapters …
                                    │
                           Formatter Pipeline (DOCX / EPUB / PDF)
```

**Implementation option:** LangGraph (or custom state machine). The master is the graph’s router; worker agents are subgraphs or tools.

---

## 4. Storing Many Chapters & Keeping the Book Synchronized

We **do not** hold all chapter text in LLM context. We use **hierarchical memory** and a **Book Sync State**.

### What to Store (Three Layers)

| Layer | What | Size | Role |
|-------|------|------|------|
| **Global** | BSO, tone guide, style guide, formatting constraints | Small, fixed | Same for every chapter |
| **Chapter summaries** | One 200–300 word summary per chapter (created after each chapter) | Grows with N | "What happened so far" |
| **Book Sync State** | narrative_arc, key_facts, themes_active, open_threads, tone_anchors, last_chapter_beat | Small, updated each chapter | Prevents drift, keeps continuity |

### Book Sync State (Updated After Every Chapter)

- **narrative_arc** — Where we are in the plan (e.g. Act 2); what comes next
- **key_facts** — Facts that must stay true (setting, events, relationships)
- **themes_active** — So tone and themes stay consistent
- **open_threads** — Unresolved plot/character threads
- **tone_anchors** — Recent tone so next chapter doesn’t drift
- **last_chapter_beat** — How the previous chapter ended; next chapter continues from here
- **chapter_summaries** — Array of summaries for Ch1…Ch(N-1)

### Flow

- **After each chapter:** Save full chapter → Summarize → Update sync state → Persist to DB.
- **When generating Chapter N:** Load Global + full Sync State (including all summaries) from DB; optionally load full text of Chapter N-1 (and N-2). Prompt the chapter agent with this context so the book stays connected and synchronized.

**Persistence:** Global and Sync State in DB (`books` or `book_sync_state`); full chapter text in `chapters` table. Only 1–2 full chapters loaded into context when needed.

---

## 5. LLM Provider Strategy

### Phase 1 (MVP — First ~10 Paying Users)

| Stage | Provider | Model | Why |
|-------|----------|--------|-----|
| **Chat / intake** | OpenAI | GPT-4o-mini | Cheap, fast, good for BSO extraction, function calling |
| **Outline** | OpenAI | GPT-4o | Strong reasoning, structured output |
| **Preview (6–8 pages)** | Anthropic | Claude 3.5 Sonnet (or Haiku) | Best long-form coherence; preview is the sale moment |
| **Full book (chapters)** | OpenAI | GPT-4o | Balanced cost/length/reliability; 128k context |

**Recommendation:** OpenAI as **primary** (chat, outline, full book). Add Anthropic **only for preview** for maximum quality. Abstract all calls behind an LLM service interface (config-driven) so you can swap later.

### Phase 2 (After Validation)

- Move **full-book generation** to open-weight (Together / Fireworks / Groq), e.g. Llama 3.1 70B or fine-tuned variant.
- Keep OpenAI for chat and Anthropic/OpenAI for outline + preview.

**Single-provider MVP option:** OpenAI only (GPT-4o for outline + preview + full book, 4o-mini for chat).

---

## 6. Cost Engineering

- 150-page book ≈ 50k words ≈ 75k tokens output.
- At ~$15 per 1M output tokens: ~$1.125 per book; with input + retries ≈ **~$2 per book**.
- Selling at $19–$49 (vs Kindle min $2.99): margins are strong.

---

## 7. Formatting Pipeline (KDP-Compliant)

**Do not use the LLM for layout.** Use a deterministic pipeline:

1. **Generate** pure markdown (per chapter, then concatenate).
2. **Convert** via backend:
   - Markdown → DOCX (template: 6×9 margins, fonts)
   - Markdown → EPUB (Kindle)
   - Markdown → Print PDF

**Tools:** Pandoc, python-docx, DOCX template injection. Apply margins, title page order, and TOC programmatically.

---

## 8. Database Design (High Level)

| Table | Purpose |
|-------|---------|
| **users** | Auth, profile |
| **books** | Metadata, BSO (JSON), outline (JSON), status, sync_state (JSON) |
| **chapters** | Full chapter content, chapter_index, status (draft/approved), token usage, version |
| **chapter_summaries** | Or stored inside books.sync_state |
| **payments** | Stripe payment records, book_id |
| **exports** | book_id, format (docx/epub/pdf), file path or URL |

---

## 9. Abuse & Jailbreak Prevention

- **Copyright / impersonation:** Block obvious prompts ("Write Harry Potter 8", "Rewrite Atomic Habits").
- **Mechanisms:** Prompt sanitization, optional similarity detection (embeddings vs known books), IP/rate limits.

---

## 10. Tech Stack

### Two Repos

| Repo | Contents | Runs as |
|------|----------|--------|
| **Repo 1 — Backend** | API (auth, users, books, payments, Stripe, webhooks), DB access, job triggering | One server: **Go** |
| **Repo 2 — Python app** | **Streamlit (UI)** + **AI API** (FastAPI: agents, LLM, sync state) | Two processes: Streamlit + AI API server |

### UI: Streamlit

- **Streamlit** is the only front-end (no separate React/Next app).
- Streamlit calls **Backend** for: auth, list/create books, BSO, payments (Stripe), download links.
- Streamlit calls **AI API** for: chat, generate outline, generate preview, generate chapter(s).

### Communication

```
User → Streamlit (UI)
         │
         ├── HTTP ──► Backend (auth, books, payments, Stripe)
         │                  │
         │                  └── HTTP ──► AI API (e.g. trigger full-book job after payment)
         │
         └── HTTP ──► AI API (chat, outline, preview, chapters)
                           │
                           └── DB (shared: chapters, sync_state)
```

### Database Access

- **Shared DB** (Postgres): Backend owns users, payments, books metadata. AI API reads BSO/outline/sync_state and writes chapters, chapter_summaries, sync_state.
- Backend triggers "generate full book" (e.g. after Stripe webhook) by calling AI API with `book_id`; AI API loads from DB and writes chapters/sync_state back.

### Python Repo (Repo 2) Structure

```
python-app/
├── streamlit_app/
│   ├── app.py
│   ├── pages/
│   │   ├── 1_chat.py
│   │   ├── 2_outline.py
│   │   └── 3_download.py
│   └── ...
├── api/                    # AI API (FastAPI)
│   ├── main.py
│   ├── agents/
│   ├── llm/
│   └── ...
├── requirements.txt
└── README.md
```

- Run UI: `streamlit run streamlit_app/app.py`
- Run AI API: `uvicorn api.main:app` (FastAPI)

### Streamlit Notes

- **Auth:** Call Backend for login; store token in `st.session_state`.
- **Long-running tasks:** For "generate full book," Streamlit polls Backend or AI API for `generation_status` (e.g. "Generating chapter 3 of 12").
- **State:** Use `st.session_state` for current book_id, BSO, outline to avoid re-fetching on every rerun.

---

## 11. End-to-End Implementation Plan

### Phase 0 — Foundation (Week 1)

| Step | Action |
|------|--------|
| 0.1 | Choose stack: **Go** for Backend; Python repo with Streamlit + FastAPI for AI. |
| 0.2 | Create both repos; .env for OpenAI, Anthropic, Stripe. |
| 0.3 | Postgres: tables users, books, chapters, payments, exports (and sync_state on books or separate table). |
| 0.4 | One LLM call from Backend or AI API to prove keys and stack. |

**Done when:** One API calls OpenAI and returns a reply; DB schema exists.

---

### Phase 1 — Chat → Book Spec (Week 2)

| Step | Action |
|------|--------|
| 1.1 | Streamlit chat UI: input, send, show messages. |
| 1.2 | Chat API (in AI API or Backend): receive message, call LLM to extract BSO (JSON). |
| 1.3 | Define BSO schema; parse and validate. |
| 1.4 | On confirm: Backend saves books row with book_specification, status = 'spec_draft'. Return book_id. |
| 1.5 | Optional: Supervisor suggests clarifying questions; show in chat. |

**Done when:** User chats, you extract and save BSO, have book_id.

---

### Phase 2 — Supervisor + Outline Agent (Week 3)

| Step | Action |
|------|--------|
| 2.1 | Supervisor module: input BSO → output need_clarification | ready_for_outline. No chapter writing. |
| 2.2 | Outline agent: input BSO → output outline (chapters + word counts). Strong model (e.g. GPT-4o). Save in DB. |
| 2.3 | Orchestration: load BSO → Supervisor → if ready, call Outline agent → save outline, status = 'outline_ready'. |
| 2.4 | Streamlit: show outline; "Continue to preview" button. |

**Done when:** Confirmed BSO produces stored outline; user sees it.

---

### Phase 3 — Preview Agent + Payment (Week 4)

| Step | Action |
|------|--------|
| 3.1 | Preview agent: BSO + outline → 6–8 page markdown (sample chapter + partial + intro). Claude 3.5 Sonnet. Save to chapters or previews. |
| 3.2 | API: given book_id, run Preview agent, return content. Streamlit shows preview. |
| 3.3 | Stripe: product/price, Checkout Session with client_reference_id = book_id. Webhook: on success, set books.status = 'paid'. |
| 3.4 | "Generate full book" only enabled when status = 'paid'; otherwise "Buy full book" → Stripe. |

**Done when:** User sees preview, pays, DB marks book as paid.

---

### Phase 4 — Full-Book Generation + Sync State (Weeks 5–6)

| Step | Action |
|------|--------|
| 4.1 | Add sync_state (JSON) to books or book_sync_state table. Initialize when starting full book. |
| 4.2 | Chapter generator: input BSO, outline, sync_state, optional previous chapter full text. Output one chapter markdown. |
| 4.3 | After each chapter: Summarizer → append to sync_state.chapter_summaries. |
| 4.4 | Sync state updater: update narrative_arc, key_facts, open_threads, last_chapter_beat, tone_anchors; persist. |
| 4.5 | Full-book job: loop over chapters; for each: generate → save → summarize → update sync_state. Use background job (Celery, Inngest, or job table + worker). |
| 4.6 | Progress: store generation_status and current chapter; Streamlit polls and shows "Chapter 3 of 12…". |

**Done when:** Paid book generates N chapters with persistent sync state; user sees progress and "Full book ready."

---

### Phase 5 — Formatting Pipeline (Week 7)

| Step | Action |
|------|--------|
| 5.1 | Concatenate chapters into one markdown. |
| 5.2 | Pandoc + templates: Markdown → DOCX (6×9), → EPUB, → PDF. |
| 5.3 | On completion: run pipeline; save files; insert exports rows (book_id, format, file_url). |
| 5.4 | Streamlit: Download buttons for DOCX, EPUB, PDF. |

**Done when:** User can download KDP-ready DOCX, EPUB, PDF.

---

### Phase 6 — Multi-Agent Graph (Week 8+)

| Step | Action |
|------|--------|
| 6.1 | Implement flow as graph (e.g. LangGraph): supervisor → outline → preview → (payment) → chapter_loop → formatter. |
| 6.2 | Each node calls existing agents. State in DB. |
| 6.3 | Human-in-the-loop: pause for payment/confirm; resume on webhook or API. |
| 6.4 | Retry: on chapter failure, retry from that chapter using stored sync_state. |

**Done when:** Same behavior driven by one graph; easy to add agents as nodes.

---

### Phase 7 — Harden (Ongoing)

- Abuse: sanitization, blocklist, optional embedding similarity.
- Cost: track tokens per book; alerts; consider moving full-book to cheaper model.
- Quality: spot-check tone/repetition; optional consistency pass using sync state.

---

## 12. Hard Problems to Solve Later

- Tone drift across 150 pages
- Repetition and low-quality middle chapters
- Hallucinated statistics and citation handling
- SEO metadata for KDP

Design specific solutions as you validate the product.

---

## 13. Strategic Questions for the Founder

- **Target niche:** Kids, self-help, business, fiction?
- **Byline:** User’s name vs ghostwriting?
- **Positioning:** AI writer assistant vs done-for-you publishing system?
- **Hosting:** Host EPUB or only deliver download?

---

*Document version: 1.0 — Full plan and tech stack as discussed.*

