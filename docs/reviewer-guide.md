# Reviewer Guide

Quick path for internship reviewers evaluating this submission.

## What to test first (5 minutes)

1. **Clone & install**
   ```bash
   git clone <repo-url>
   cd assignment5
   cp .env.example .env.local
   npm install
   npm run dev
   ```
2. **Happy path** — paste the CRM prompt from [demo-prompts.md](demo-prompts.md) → **Generate** → confirm AppSpec tables populate.
3. **Quality gates**
   ```bash
   npm run lint
   npm run build
   npm run evaluate
   ```
4. **Read** `evaluation/summary.md` — expect 12/12 success in mock mode.

## Key architecture decisions

| Decision | Where | Why |
|----------|-------|-----|
| Config-driven routing | `src/config/routing.ts` | Stages never embed model IDs |
| AI gateway + adapters | `src/lib/ai/gateway/` | Provider swap, fallback, cost tracking |
| Validation returns errors | `src/lib/pipeline/validators/validation-engine.ts` | Enables repair without throws |
| Multi-strategy repair | `src/lib/pipeline/repair/` | Fix spec before expensive re-runs |
| In-memory job store + SSE | `src/lib/pipeline/orchestration/` | Simple demo; poll fallback for serverless |
| `after()` for background jobs | `src/app/api/generate/route.ts` | Vercel-compatible lifecycle |

## How to run evaluate

```bash
npm run evaluate
```

Outputs:

- `evaluation/results.json` — per-prompt latency, cost, success
- `evaluation/summary.md` — aggregate metrics

Uses the **same orchestrator** as the HTTP API, in-process. No server required.

## How mock mode works

1. Routing picks a provider per stage (`src/config/routing.ts`).
2. Adapter checks for API key (`src/lib/ai/providers/base-adapter.ts`).
3. If missing or SDK fails → **deterministic mock** from `src/lib/pipeline/mocks/`.
4. UI cost panel reflects mock token estimates.
5. Evaluation logs: `SDK call failed — falling back to deterministic mock` (expected without keys).

To see **real** LLM output: set `OPENAI_API_KEY` (or another configured provider) in `.env.local` and restart.

## Known tradeoffs

| Tradeoff | Impact |
|----------|--------|
| In-memory jobs | Vercel multi-instance may miss SSE; 3s poll recovers UI |
| Mock fallback | Invalid keys still “work” — check logs for mock warnings |
| Integrations stubbed | Registry + validation real; OAuth/webhooks not implemented |
| No E2E browser tests | `npm run evaluate` is the regression suite |

## File map (high signal)

```
src/config/routing.ts          # Model routing
src/lib/ai/gateway/            # Provider abstraction
src/lib/pipeline/orchestration/ # Jobs + orchestrator
src/lib/pipeline/validators/   # 11+ validation rules
src/lib/pipeline/repair/         # Repair strategies
evaluation/                      # Regression prompts
docs/deployment.md               # Vercel instructions
```

## Deployed demo

If the candidate provided a Vercel URL, test one generation there, then compare with local `npm run dev` if SSE behaves inconsistently.

## More documentation

- [Deployment](deployment.md)
- [Demo script](demo-script.md)
- [Final audit](final-audit.md)
- [Adversarial tests](adversarial-tests.md)
- [Submission checklist](../SUBMISSION_CHECKLIST.md)
