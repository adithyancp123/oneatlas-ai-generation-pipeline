# AppSpec Pipeline (OneAtlas Assignment)

**Live demo:** [https://oneatlas-ai-generation-pipeline.vercel.app](https://oneatlas-ai-generation-pipeline.vercel.app) — deploy or redeploy via [DEPLOYMENT.md](DEPLOYMENT.md) if the link is not live yet.

Production-quality multi-stage AI pipeline that converts natural language app descriptions into validated, machine-readable **AppSpec** documents. Mock mode works with **zero API keys** — the gateway falls back to deterministic mocks so reviewers can run the full flow locally.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/adithyancp123/oneatlas-ai-generation-pipeline)

**Repository:** [github.com/adithyancp123/oneatlas-ai-generation-pipeline](https://github.com/adithyancp123/oneatlas-ai-generation-pipeline)

## Quick start (must work in under 5 minutes)

### Prerequisites

- **Node.js 18+** (Node 20+ recommended)
- **npm** 9+

### Steps

```bash
# 1. Clone repo
git clone <your-repo-url>
cd assignment5

# 2. Copy env template and fill in API keys (optional for mock mode)
cp .env.example .env.local
# Edit .env.local — add at least one provider key for live LLM output, or leave empty for mocks

# 3. Install dependencies
npm install

# 4. Start dev server
npm run dev

# 5. Open the dashboard
```

Open [http://localhost:3000](http://localhost:3000), enter a prompt (e.g. *“E-commerce backend with Stripe and Gmail order confirmations”*), and click **Generate**.

**Verify before submit:**

```bash
npm run lint && npm run typecheck && npm run build
npx tsx evaluation/run-eval.ts   # requires npm run dev in another terminal
```

## Environment variables

All variables are loaded via `src/config/env.ts` (Zod-validated). **None are strictly required** for mock mode.

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Optional | `development` \| `production` \| `test` (default: `development`) |
| `NEXT_PUBLIC_APP_URL` | Optional | Public app URL for metadata / absolute links (e.g. `http://localhost:3000`) |
| `OPENAI_API_KEY` | Optional | OpenAI API key (AppSpec generation, repair, fallback) |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key |
| `GROQ_API_KEY` | Optional | Groq API key (intent extraction primary) |
| `GEMINI_API_KEY` | Optional | Google Gemini API key (schema generation primary) |
| `GOOGLE_AI_API_KEY` | Optional | Alternate Gemini key (used if `GEMINI_API_KEY` unset) |
| `DEEPSEEK_API_KEY` | Optional | DeepSeek API key |
| `OPENROUTER_API_KEY` | Optional | OpenRouter universal fallback when configured |
| `MISTRAL_API_KEY` | Optional | Mistral API key |
| `OPENAI_DEFAULT_MODEL` | Optional | Override default OpenAI model name |
| `ANTHROPIC_DEFAULT_MODEL` | Optional | Override default Anthropic model name |
| `GROQ_DEFAULT_MODEL` | Optional | Override default Groq model name |
| `GEMINI_DEFAULT_MODEL` | Optional | Override default Gemini model name |
| `MISTRAL_DEFAULT_MODEL` | Optional | Override default Mistral model name |
| `OPENROUTER_DEFAULT_MODEL` | Optional | Override default OpenRouter model (e.g. `openrouter/auto`) |
| `DEEPSEEK_DEFAULT_MODEL` | Optional | Override default DeepSeek model name |
| `INTENT_EXTRACTION_MODEL_OVERRIDE` | Optional | Force model for intent extraction stage |
| `SCHEMA_GENERATION_MODEL_OVERRIDE` | Optional | Force model for schema generation stage |
| `APP_SPEC_GENERATION_MODEL_OVERRIDE` | Optional | Force model for AppSpec generation stage |
| `REPAIR_MODEL_OVERRIDE` | Optional | Force model for LLM-assisted repair |
| `PIPELINE_MAX_RETRIES` | Optional | Max repair attempts per job (default: `3`) |
| `PIPELINE_TIMEOUT_MS` | Optional | Pipeline timeout in ms (default: `120000`) |
| `ENABLE_COST_TRACKING` | Optional | `true` \| `false` — per-stage cost lines on job (default: `true`) |
| `LOG_LEVEL` | Optional | `debug` \| `info` \| `warn` \| `error` (default: `info`) |

Copy [`.env.example`](.env.example) to `.env.local` and paste keys. Placeholder values are treated as missing (mock mode).

## Pipeline architecture

### Three generation stages

1. **Intent Extraction** — Parses the user prompt into structured intent: app type, entities, actors, goals, integration requests, assumptions, warnings, and confidence metadata. Routed to **Groq** (primary) with OpenAI fallback (`src/config/routing.ts`).

2. **Schema Generation** — Produces `dataSchema`: entities, `snake_case` table names, fields (including `tenant_id`), and relations. Routed to **Gemini** (primary) with OpenAI fallback.

3. **AppSpec Generation** — Assembles the full **AppSpec**: pages, API endpoints, auth rules, integration hooks, and workflow stubs. Routed to **OpenAI** (primary) with Groq fallback.

After each stage, output is validated before the job advances. A dedicated **repair** stage runs when validation fails (up to 3 attempts).

### Validation engine

- **Zod schemas** per stage (`appIntentSchema`, `dataSchemaSchema`, `appSpecSchema`) in `src/lib/pipeline/validators/schemas.ts`.
- **Domain rules** in `validation-engine.ts`: `tenant_id` on entities, snake_case tables, page↔API binding, integration registry IDs, workflow refs, auth permissions, and more.
- **Cross-layer checks** when validating the final AppSpec against the canonical `dataSchema` from stage 2 (entity/table alignment, bound entities on endpoints). Smoke test: `npm run test:cross-layer`.

Validation returns structured errors (`code`, `message`, `field`, `stageId`) and never throws.

### Repair engine

Three deterministic strategies, applied in order (optional LLM correction on field/consistency when needed):

| Strategy | Purpose |
|----------|---------|
| **structural** | Recover malformed JSON / missing top-level shape from raw stage output |
| **field** | Fix `tenant_id`, snake_case tables, relations, orphan pages |
| **consistency** | Align page↔API, registry integrations, workflows, auth, cross-stage `dataSchema` |

Each attempt is logged in `job.repairLog.entries` (strategy, outcome, latency, errors fixed).

### AI gateway

- **Config-driven routing** — `STAGE_ROUTING_CONFIG` in `src/config/routing.ts` defines primary/fallback provider per stage via env model keys (no hardcoded model names in stage code).
- **Provider adapters** — OpenAI, Anthropic, Groq, Gemini, Mistral, DeepSeek, OpenRouter (+ mock when keys missing or SDK fails).
- **OpenRouter fallback** — When `OPENROUTER_API_KEY` is set, OpenRouter is appended as a universal fallback after primary/fallback routes fail (`src/lib/ai/gateway/ai-gateway.ts`).
- **Cost & latency** — Per-call token estimates stored on the job (`cost.lines[]`, `latencies[]`); surfaced in the UI.

**Streaming:** `GET /api/generate/:jobId/stream` emits SSE stage events; `job-store.replayEvents()` replays buffered events to late subscribers. The UI also polls every 3s for serverless resilience.

## Integrations

### Fully implemented (registry + typed schemas + payload validation + stub adapters)

| ID | Name | Notes |
|----|------|-------|
| `slack` | Slack | Triggers/actions typed; stub adapter returns deterministic results |
| `whatsapp-twilio` | WhatsApp (Twilio) | Inbound/outbound message schemas; stub adapter |
| `gmail` | Gmail | Email send/receive hooks; stub adapter |
| `stripe` | Stripe | Payments/subscriptions; stub adapter |
| `jira` | Jira | Issues/comments; stub adapter |

Live OAuth, webhooks, and vendor API calls are **out of scope** — adapters validate payloads and return stub execution results. Vendor credentials (`SLACK_CLIENT_ID`, `TWILIO_*`, `STRIPE_*`, etc.) are documented on each integration definition but are not required for the pipeline demo.

### STUBBED / not in registry

| Integration | Status |
|-------------|--------|
| **Google Sheets** | STUBBED — detected in prompts; no registry entry or adapter (export/sync not implemented) |
| **Telegram** | STUBBED — keyword-detected only; surfaced in `skippedIntegrations` / warnings |
| **Discord** | STUBBED — keyword-detected only; surfaced in warnings |
| **SAP** | STUBBED — keyword-detected only; surfaced in warnings |
| **HubSpot** | STUBBED — keyword-detected only; surfaced in warnings |
| **Zendesk** | STUBBED — keyword-detected only; surfaced in warnings |

Unsupported names are never silently dropped — they appear in AppSpec intent metadata (`requestedIntegrations`, `skippedIntegrations`, `warnings[]`).

## Evaluation results

**Ran:** 2026-05-30T10:34:10.244Z  
**Endpoint:** http://localhost:3000

### Headline metrics

This HTTP evaluation suite exercised all twelve assignment prompts (seven standard, five edge cases) against the live `POST /api/generate` and `GET /api/generate/:jobId` API on the running Next.js dev server, polling every 1.5 seconds with a 60-second timeout per job. **Success rate: 100%** (12/12 jobs completed with a non-null AppSpec). **Average pipeline latency:** 3262 ms (sum of per-stage `latencies` on the job). **Average estimated token cost:** $0.0093 per prompt. **Most common failure type:** no failures observed. Seven standard prompts covered CRM, task management, inventory, HR, e-commerce, events, and project tracking; edge cases included a one-word prompt, Notion-for-doctors, an overscoped marketplace stack, conflicting multi-product scope, and a vague “smart” task manager.

### Failure analysis

All twelve prompts completed without terminal failure. No repair attempts were required in this run (retry count zero across the board). The **weakest stage** observed was **none** (stage most associated with failure or validation errors). The dominant **repair strategy** was **none**. 6 of 12 runs emitted at least one integration hook in `appSpec.integrations` (Slack, Gmail, Stripe, Jira detected where named explicitly). 3 prompt(s) mentioned WhatsApp or Google Sheets but did not surface matching hooks — a quality gap despite overall success.

Edge-case prompts stress intent extraction, domain prioritization, and MVP scope narrowing; integration-heavy standard prompts stress `appSpecGeneration` and hook wiring. Provider mode may be mock/fallback when API keys are absent; costs are gateway estimates, not billed usage.

### Concrete fix

Strengthen integration extraction in the intent and AppSpec stages so WhatsApp (`whatsapp-twilio`) and Google Sheets appear in `integrations[]` when prompts request them, and add eval assertions in `run-eval.ts` for those IDs. Re-run `npx tsx evaluation/run-eval.ts` after changes.

**Full per-prompt log:** [evaluation-log.json](evaluation-log.json)  
**Summary (this section):** [evaluation-summary.md](evaluation-summary.md)  
**Re-run:** `npx tsx evaluation/run-eval.ts` (dev server must be running)

## Known limitations and cuts made

| Area | Deliberate cut |
|------|----------------|
| **Job persistence** | In-memory job store — jobs do not survive Vercel cold starts or multi-instance deploys |
| **Integrations** | Registry + stub adapters only — no live OAuth, webhooks, or vendor sandboxes |
| **Clarification UX** | `clarificationRequired` is always `false`; vague prompts use `assumptions[]` instead of blocking the user |
| **Auth / workflows** | Simplified models (roles + flat workflow steps) — not a full RBAC or BPM engine |
| **Page↔API binding** | Substring heuristic by default; optional `boundEntity` for explicit links |
| **Durable SSE** | Event buffer is per-process; reconnect replay works within the same instance only |
| **WhatsApp / Sheets in eval** | Prompts mentioning them do not always emit hooks — see evaluation summary |
| **Screenshots / deploy URL** | Add `docs/screenshots/*.png` and Vercel preview URL before final recruiter handoff |

See also [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md), [DEPLOYMENT.md](DEPLOYMENT.md), [docs/reviewer-guide.md](docs/reviewer-guide.md), and [docs/demo-script.md](docs/demo-script.md) (60s screen recording script).

## License

Private — internship assignment.
