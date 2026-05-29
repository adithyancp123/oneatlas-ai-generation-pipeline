# AppSpec Pipeline

Production-quality multi-stage AI pipeline that converts natural language app descriptions into validated, machine-readable **AppSpec** documents.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/YOUR_REPO)

> Replace `YOUR_USERNAME/YOUR_REPO` in the button URL after pushing to GitHub.

## Screenshots

| Home | Generating | AppSpec output |
|------|------------|----------------|
| _Add `docs/screenshots/home.png`_ | _Add `docs/screenshots/generating.png`_ | _Add `docs/screenshots/appspec.png`_ |

See [docs/screenshots/README.md](docs/screenshots/README.md) for capture instructions.

## Architecture

```
┌─────────────┐     POST /api/generate      ┌──────────────────────┐
│  Web UI     │ ──────────────────────────► │ PipelineOrchestrator │
│  (SSE)      │ ◄──── SSE stage events ──── │  + in-memory JobStore│
└─────────────┘                             └──────────┬───────────┘
                                                       │
                       ┌───────────────────────────────┼───────────────────────────────┐
                       ▼                               ▼                               ▼
              intentExtraction              schemaGeneration                 appSpecGeneration
                       │                               │                               │
                       └───────────────────────────────┴────────── validation ─────────┘
                                                       │
                                              repair (on failure)
                                                       ▼
                                              Validated AppSpec
```

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Routing** | `src/config/routing.ts` | Per-stage primary/fallback models via env keys |
| **AI Gateway** | `src/lib/ai/gateway/` | Provider abstraction, fallback, cost/latency |
| **Providers** | `src/lib/ai/providers/` | SDK adapters (OpenAI, Anthropic, Groq, …) |
| **Validation** | `src/lib/pipeline/validators/` | Zod + domain rules (11 checks) |
| **Repair** | `src/lib/pipeline/repair/` | Structural, field, consistency, optional LLM |
| **Orchestration** | `src/lib/pipeline/orchestration/` | Job lifecycle, SSE events |
| **Evaluation** | `evaluation/` | Automated prompt regression suite |

## Local setup (< 5 minutes)

```bash
git clone <repo>
cd assignment5
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Quality commands

```bash
npm run lint        # ESLint, zero warnings
npm run typecheck   # tsc --noEmit
npm run build       # Production build
npm run evaluate    # Run evaluation suite → evaluation/results.json
```

## Environment variables

See [`.env.example`](.env.example). Minimum for **mock mode** (no keys): none required.

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI provider |
| `ANTHROPIC_API_KEY` | Anthropic provider |
| `GROQ_API_KEY` | Groq provider |
| `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY` | Google Gemini |
| `DEEPSEEK_API_KEY` | DeepSeek (OpenAI-compatible) |
| `MISTRAL_API_KEY` | Mistral |
| `OPENROUTER_API_KEY` | Universal fallback provider |
| `*_DEFAULT_MODEL` | Model names (referenced by routing config only) |
| `*_MODEL_OVERRIDE` | Per-stage model overrides |

## Pipeline

1. **intentExtraction** — app name, type, entities, features, integrations, assumptions
2. **schemaGeneration** — entities with `tenant_id`, snake_case tables, bidirectional relations
3. **appSpecGeneration** — pages, API endpoints, auth, integrations, workflows
4. **repair** — runs **before** retries when validation fails

Each stage validates output; failures trigger the repair engine (up to 3 attempts).

## Routing system

Single config: `src/config/routing.ts`. Stages never embed model strings.

- Primary + fallback provider per stage
- Strategy: `primary-first`, `cost-optimized`, `latency-optimized`, `fallback-on-error`
- Cost/latency thresholds trigger fallback
- OpenRouter used as universal fallback on 429 / 5xx / timeout

## Repair engine

Classifies failures and applies strategies in order:

| Strategy | Fixes |
|----------|-------|
| **structural** | Malformed/truncated JSON recovery |
| **field** | Missing `tenant_id`, snake_case tables, default pages |
| **consistency** | Page↔API alignment, registry integrations, auth roles |
| **llm_correction** | Optional gateway call when programmatic repair insufficient |

Repair log entry format:

```json
{
  "strategy": "field",
  "inputError": "missing tenant_id",
  "attempt": 1,
  "outcome": "repaired",
  "latencyMs": 12
}
```

## Validation layer

`validation-engine.ts` returns structured errors (never throws):

- Zod schema validation
- `tenant_id` on every entity
- snake_case `tableName`
- Bidirectional relations
- Integration registry + valid actions/triggers
- Page–API consistency
- Auth role consistency
- Workflow/integration alignment

## Supported integrations

Slack, WhatsApp (Twilio), Gmail, Stripe, Jira — metadata in `src/lib/integrations/registry/`. Live OAuth/webhooks are **stubbed**.

## Mock vs real providers

| Mode | When | Behavior |
|------|------|----------|
| **Mock** | API key missing | Deterministic CRM/ecommerce-aware mocks |
| **Real** | API key present | Official SDK call + JSON structured output + 1 retry on parse failure |

Provider capabilities metadata: `structuredOutput`, `supportsJson`, `fast`, `cheap`, `reasoning`.

## Evaluation results

Run `npm run evaluate` to generate:

- `evaluation/results.json` — per-prompt metrics
- `evaluation/summary.md` — success rate, weakest stage, next fix

Includes 7 standard prompts + 5 edge cases (vague, overscoped, conflicting domains).

**Latest run:** 100% success (12/12), ~2936ms avg latency, ~$0.013 avg mock cost per run.

## Deployment (Vercel)

Full guide: **[docs/deployment.md](docs/deployment.md)**

1. Import repo in Vercel (or use the Deploy button above after updating the repo URL).
2. Environment variables: optional — see [`.env.example`](.env.example). Mock mode works with zero keys.
3. Build command: `npm run build` (also in `vercel.json`).
4. Node.js 20+.

**Note:** In-memory job store does not persist across serverless instances — acceptable for demo; use Redis for production.

```bash
npm run build && npm start   # verify production build locally
```

## Known tradeoffs

| Choice | Why |
|--------|-----|
| In-memory job store | Fast local demo; no Redis dependency |
| Mock fallback on missing/invalid keys | Reviewers can run without secrets; evaluation always completes |
| Polling + SSE | Serverless may drop SSE; 3s poll reconciles state |
| Repair before re-run | Cheaper than full pipeline retry on validation-only failures |
| No streaming tokens to UI | Scope — stage-level SSE is enough for assignment |

## Architecture decisions

1. **Config-driven routing** (`src/config/routing.ts`) — stages never hardcode model IDs; env overrides per stage.
2. **Gateway + adapters** — one `AIGateway` with provider capabilities, OpenRouter as universal fallback on 429/5xx/timeout.
3. **Validation returns errors, never throws** — orchestrator can branch to repair without try/catch spaghetti.
4. **Structured JSON with retry** — parse failure triggers one correction call before repair engine.
5. **Zustand + SSE hook** — minimal client state; server is source of truth via job store.
6. **Evaluation in-process** — same orchestrator as production API for regression signal without HTTP flakiness.

## Future improvements

- Durable job store (Redis / Postgres) for Vercel multi-instance
- `STRICT_PROVIDER_MODE` to fail loudly when keys are invalid
- Live integration OAuth and webhook handlers
- Human clarification step for vague prompts
- Remove unused deps (`@google/genai`, `eventsource-parser`)
- Migrate `middleware.ts` to Next.js 16 `proxy` convention

## Why certain scope cuts were made

| Cut | Rationale |
|-----|-----------|
| Persistent storage | Assignment focuses on pipeline correctness, not infra |
| Live Slack/Stripe/etc. | Integration **metadata** and validation matter more than OAuth plumbing |
| Full UI redesign | Engineer-minimal UI; effort went to validation/repair/evaluation |
| Real-time token stream | Stage events satisfy observability requirement |
| E2E browser tests | `npm run evaluate` gives repeatable 12-prompt regression |

## Tradeoffs and scope (summary table)

| Implemented | Stubbed / limited |
|-------------|-------------------|
| Full pipeline + SSE + repair | Persistent job store (in-memory only) |
| 7 provider SDK adapters | Live integration OAuth/webhooks |
| 11-rule validation engine | Multi-instance SSE on serverless |
| Evaluation suite | Human-in-the-loop clarification UI |
| Cost/token tracking | Real-time provider billing APIs |

## What is fully implemented vs stubbed

**Fully implemented:** Pipeline orchestration, SSE streaming, config-driven routing, validation engine, multi-strategy repair, mock generation path, API routes, UI with cost/job panels, evaluation runner, provider SDK wiring with structured JSON retry.

**Stubbed:** Integration live connections, persistent storage, streaming tokens to UI, advanced relation graph auto-repair.

## Additional docs

| Doc | Audience |
|-----|----------|
| [Reviewer guide](docs/reviewer-guide.md) | Recruiters / graders |
| [Deployment](docs/deployment.md) | Vercel setup |
| [Demo script](docs/demo-script.md) | 60s walkthrough |
| [Demo prompts](docs/demo-prompts.md) | Best prompts for demo |
| [Final audit](docs/final-audit.md) | Engineering audit log |
| [Adversarial tests](docs/adversarial-tests.md) | Edge-case matrix |
| [Submission checklist](SUBMISSION_CHECKLIST.md) | Pre-submit gates |

## License

Private — internship assignment.
