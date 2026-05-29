# Reviewer Guide

Fast path for internship reviewers evaluating this submission.

## 1-minute quickstart

```bash
git clone <repo-url>
cd assignment5
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No `.env` required — mock mode runs with zero API keys.

Optional quality check (30 seconds):

```bash
npm run lint && npm run build && npm run evaluate
```

Expect **12/12** in `evaluation/summary.md`.

---

## What to do in the UI

1. **Paste a demo prompt** in the left **Prompt** card (examples below).
2. Click **Generate AppSpec** (bottom of the Prompt card).
3. **Watch the left column:**
   - Amber status banner → “Generation in progress”
   - **Pipeline** card — stages move from pending → running → complete
   - **Job summary** and **Cost** panels populate when done
4. **Watch the right column:**
   - **AppSpec** card fills with entities, API endpoints, and workflows
5. Scroll to **AI Providers** — configured count and routing summary (keys optional).
6. **Integrations** card lists registry connectors (Slack, Stripe, Gmail, etc.).

## Demo prompt examples

Copy any of these into the prompt box:

```
CRM for real estate with Slack notifications and Stripe billing
```

```
Ecommerce app with Stripe payments and inventory management
```

```
Task manager with Gmail integration and team assignments
```

## What you should observe

| Step | Expected behavior |
|------|-------------------|
| After Generate | Status banner turns amber; button shows “Generating…” |
| Pipeline | Four stages highlight (intent → schema → AppSpec → repair if needed) |
| Success | Green banner; AppSpec tables on the right |
| Cost panel | Per-stage token estimates (mock values without API keys) |
| Providers | “Mock fallback on all” if no keys; routing summary lists stage → provider |
| Failure | Amber/red validation list in alerts; repair log if repair ran |

**Typical duration:** 2–5 seconds in mock mode locally.

## Mock vs real providers

- **No keys:** Deterministic mocks — full pipeline still completes. Cost panel shows estimates.
- **With keys:** Set `OPENAI_API_KEY` (or others) in `.env.local`, restart `npm run dev`, regenerate for live LLM output.

Routing is defined only in `src/config/routing.ts` — stages never hardcode model IDs.

## Key files (if you read code)

```
src/config/routing.ts              # Stage → provider routing
src/lib/pipeline/orchestration/    # Jobs + orchestrator
src/lib/pipeline/validators/       # Validation engine
src/lib/pipeline/repair/           # Repair strategies
src/app/api/generate/route.ts      # POST + background after()
evaluation/run.ts                  # Regression suite
```

## Known tradeoffs (not bugs)

| Item | Note |
|------|------|
| In-memory jobs | Vercel multi-instance may miss SSE; UI polls every 3s |
| Mock fallback | Missing/invalid keys still succeed — check provider panel |
| Integrations | Metadata + validation only; no live OAuth |

## More documentation

- [Deployment](deployment.md) — Vercel
- [Demo prompts](demo-prompts.md) — extended list + edge cases
- [Demo script](demo-script.md) — 60s narrated walkthrough
- [Submission checklist](../SUBMISSION_CHECKLIST.md)
