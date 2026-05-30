# AppSpec Pipeline

**Live demo:** https://oneatlas-ai-generation-pipeline.vercel.app  
**GitHub:** https://github.com/adithyancp123/oneatlas-ai-generation-pipeline

A multi-stage AI pipeline that turns a plain-English app description into a
validated, machine-readable AppSpec — entities, schema, API endpoints, auth
rules, workflow stubs, and integration hooks.

Built as part of a 72-hour engineering trial.

---

## What it does

You type something like:

> "CRM for a real estate agency. Agents manage leads and deals.
> WhatsApp notification when a deal closes."

The pipeline runs three stages:

1. **Intent Extraction** — figures out what you're building, what entities
   are involved, and which integrations you need
2. **Schema Generation** — turns that into a proper data schema with
   relations, field types, and tenant isolation
3. **AppSpec Generation** — produces pages, API endpoints, auth rules,
   and workflow stubs wired to your integrations

Each stage validates its output with Zod before passing it downstream.
If something's broken, the repair engine tries to fix it before retrying.

---

## Running locally

Requirements: Node 18+, npm 9+

```bash
git clone https://github.com/adithyancp123/oneatlas-ai-generation-pipeline
cd oneatlas-ai-generation-pipeline
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000

**No API keys needed** — the pipeline runs in mock fallback mode by default.
Add keys to `.env.local` to get live LLM output.

---

## API keys

| Variable | Provider | Required |
|---|---|---|
| OPENAI_API_KEY | OpenAI | Optional |
| ANTHROPIC_API_KEY | Anthropic | Optional |
| GROQ_API_KEY | Groq | Optional |
| GEMINI_API_KEY | Google Gemini | Optional |
| GOOGLE_AI_API_KEY | Google AI | Optional |
| DEEPSEEK_API_KEY | DeepSeek | Optional |
| OPENROUTER_API_KEY | OpenRouter (fallback) | Optional |
| MISTRAL_API_KEY | Mistral | Optional |

All optional. Mock mode covers the full pipeline flow without any keys.

---

## Architecture

### Pipeline stages

Each stage is isolated — typed input, typed output, validated before
passing downstream.

**Stage 1 — Intent Extraction**
Runs on Groq (Llama 3) for low latency. Extracts appName, appType,
entities, features, integrations_requested, and assumptions.
Vague prompts get documented assumptions rather than a clarification prompt.

**Stage 2 — Schema Generation**
Runs on Google Gemini. Produces EntitySchema objects with fields,
relations, and a tenantId on every entity. Relation graphs are
validated for bidirectional consistency before moving on.

**Stage 3 — AppSpec Generation**
Runs on OpenAI. Produces pages, API endpoints, authRules, integrationHooks,
and workflowStubs. Every page must have a matching endpoint or it fails
validation.

### Validation

Zod schemas run after every stage. Errors come back as structured objects
— the pipeline never throws. Cross-layer checks catch things like a workflow
referencing an entity that doesn't exist in the schema, or an integration
hook pointing to an unregistered integration.

### Repair engine

Three strategies, tried in order:

- **Structural** — malformed or truncated JSON. Bracket-matching extraction
  plus typed defaults from the stage schema. No LLM call.
- **Field** — missing or wrong-typed field. Narrow re-prompt for that
  field only, not the whole stage.
- **Consistency** — broken cross-layer reference. Fuzzy-matched
  programmatically where possible; LLM only when it's not deterministic.

Every attempt is logged with strategy, error input, and outcome.

### AI gateway

Model selection lives in a single routing config — not scattered across
stage files. Each stage has a primary model, a fallback, and OpenRouter
as a universal fallback on 429 or 5xx.

| Stage | Primary | Fallback |
|---|---|---|
| Intent Extraction | Groq (Llama 3) | OpenAI (gpt-4o-mini) |
| Schema Generation | Google Gemini | Google AI |
| AppSpec Generation | OpenAI (gpt-4o) | Groq |
| Repair | Same as failed stage | Escalates up |

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/generate | Submit a prompt, returns jobId |
| GET | /api/generate/:jobId | Job status, AppSpec, cost, repair log |
| GET | /api/generate/:jobId/stream | SSE stream — stage_start, stage_complete, stage_failed, generation_complete |
| POST | /api/generate/:jobId/repair | Manually trigger repair on a stage |
| GET | /api/integrations | Full integration registry |

SSE stream stays open until job resolves. On reconnect, all prior events
replay from the job store.

---

## Integrations

Five integrations fully implemented with registry, trigger descriptors,
action schemas, and validated workflow stubs:

| Integration | Auth | Status |
|---|---|---|
| Slack | OAuth2 | Implemented |
| WhatsApp (Twilio) | API Key | Implemented |
| Gmail / Google Workspace | OAuth2 | Implemented |
| Stripe | API Key | Implemented |
| Jira | API Key | Implemented |

Remaining integrations (Notion, Airtable, HubSpot, Salesforce, GitHub,
Zapier, Twilio SMS, Webhook, Google Sheets) are stubbed with the correct
interface — authType, trigger descriptors, and action schemas defined,
HTTP calls not implemented.

---

## Evaluation

Ran the full suite of 12 prompts (7 standard + 5 edge cases).
Results are in [`evaluation-log.json`](./evaluation-log.json) at the
project root. Summary in [`evaluation-summary.md`](./evaluation-summary.md).

**12/12 succeeded. Average latency: 3262ms. Average cost: $0.0089.**

Edge cases handled:
- `"An app."` — generic SaaS scaffold, assumptions documented, no crash
- `"Notion for doctors"` — ambiguous, assumptions applied, custom type
- Overscoped platform — MVP-first, scope cuts documented
- Conflicting domains — dominant domain selected, decision logged
- `"Make it smart"` — vague modifier treated as assumption

---

## What I cut and why

- No live OAuth flows — stubs have correct metadata, HTTP calls not wired
- In-memory job store — resets on server restart, good enough for the trial
- No clarification UX — went with assumption-driven generation throughout
- Mobile/native app generation out of scope — web APIs only

---

## Stack

Next.js 16, React, TailwindCSS, TypeScript strict mode, Zod, Node.js
