# AI Publishing — Next.js frontend

App Router UI for the AI Publishing Engine. Proxies AI calls to the FastAPI service so the browser never needs direct access to the Python server (avoids CORS in production when same-origin).

## Setup

```bash
cd frontend
cp .env.example .env
# Set AI_API_URL=http://127.0.0.1:8000 (or your FastAPI base)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run production server (after `build`) |

## Routes

| Path | Description |
|------|-------------|
| `/` | Landing |
| `/chat` | Intake chat (BSO), welcome flow, video block |
| `/book/[id]/outline` | Outline from `book_spec` |
| `/book/[id]/preview` | Preview markdown + buy placeholder |
| `/book/[id]/full` | Mock payment gate + full book placeholder |

Publishing/chat state lives in memory only; a full page refresh starts a new session.

## Architecture

- **`src/app/api/ai/[...path]`** — Server proxy to FastAPI `/api/*`.
- **`src/lib/api/*`** — Thin HTTP clients (used from client components).
- **`src/stores/`** — Zustand store + types.
- **`src/hooks/`** — Chat send, video injection, React Query mutations, scroll.
- **`src/components/`** — Feature UI split by domain (`chat`, `outline`, `preview`, `book`, `ui`).

## Deployment

Build a Node image or use Vercel/your host. Set **`AI_API_URL`** to the internal URL of the FastAPI service (not `NEXT_PUBLIC_*` unless you intentionally call FastAPI from the browser).
