# AppSpec Pipeline

Production-quality multi-stage AI pipeline that converts natural language app descriptions into validated, machine-readable **AppSpec** documents.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/YOUR_REPO)

> Replace `YOUR_USERNAME/YOUR_REPO` in the deploy button URL after pushing to GitHub.

## Project overview

This assignment implements an **AI-native AppSpec pipeline**: you describe an app in plain text, and the system runs a staged workflow (intent → schema → AppSpec), validates the result, repairs failures when possible, and streams progress to a dark SaaS dashboard.

**How it works**

1. The UI sends your prompt to `POST /api/generate`.
2. The orchestrator runs four stages in order, each routed to a primary/fallback AI provider via `src/config/routing.ts`.
3. Each stage output is validated (Zod + domain rules). Failures trigger the repair engine before expensive retries.
4. Stage events stream over SSE; the client also polls every 3s for serverless resilience.
5. A validated **AppSpec** (entities, API endpoints, workflows, integrations) appears in the right column.

Mock mode works with **zero API keys** — adapters fall back to deterministic mocks so reviewers can run the full flow locally or on Vercel.

## Architecture

```
Prompt
   ↓
Intent Extraction
   ↓
Schema Generation
   ↓
AppSpec Generation
   ↓
Validation + Repair
   ↓
Final AppSpec
```

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Routing | `src/config/routing.ts` | Per-stage primary/fallback models (env-driven) |
| AI Gateway | `src/lib/ai/gateway/` | Provider abstraction, fallback, cost/latency |
| Providers | `src/lib/ai/providers/` | SDK adapters (OpenAI, Anthropic, Groq, Gemini, …) |
| Validation | `src/lib/pipeline/validators/` | Zod + 11+ domain rules |
| Repair | `src/lib/pipeline/repair/` | Structural, field, consistency, optional LLM; full attempt logging |
| Orchestration | `src/lib/pipeline/orchestration/` | Job lifecycle, SSE events |
| Evaluation | `evaluation/` | 12-prompt regression suite |

## Features

- Config-driven AI routing
- Multi-provider support (8 providers, mock fallback on all)
- Repair engine (multi-strategy, up to 3 attempts)
- Validation engine (structured errors, never throws)
- SSE streaming with poll fallback
- Cost tracking per stage
- Evaluation suite (`npm run evaluate`)
- Mock fallback mode (no keys required)
- Responsive dark dashboard UI

## Screenshots

Add PNGs under `docs/screenshots/` before submission (see [docs/screenshots/README.md](docs/screenshots/README.md)).

| UI | Description | File |
|----|-------------|------|
| Home dashboard | Empty state, prompt card, two-column layout | `home-dashboard.png` |
| Generation flow | Status banner + Generate in progress | `generation-flow.png` |
| Pipeline progress | Stage list with running/complete states | `pipeline.png` |
| Provider configuration | AI Providers panel + routing summary | `providers.png` |
| AppSpec output | Entities, endpoints, workflows tables | `appspec-output.png` |

## Local setup

```bash
git clone <repo-url>
cd assignment5
cp .env.example .env.local   # optional — mock mode needs no keys
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional: set provider keys in `.env.local` for real LLM output (see [`.env.example`](.env.example)).

## Verification

```bash
npm run lint              # ESLint, zero warnings
npm run typecheck         # tsc --noEmit
npm run build             # Production build
npm run evaluate          # 12-prompt regression → evaluation/results.json
npm run test:adversarial  # Malformed AppSpec repair cases (3/3)
```

Without API keys, `npm run evaluate` may log `SDK call failed — falling back to deterministic mock` for each stage. That is **expected** (fallback mode, not a test failure); the run still ends with `Evaluation complete: 12/12 succeeded`.

Latest evaluation: **12/12 success** — see [evaluation/summary.md](evaluation/summary.md).  
Full gate results: [docs/repo-health.md](docs/repo-health.md).

## AppSpec consistency model

The AppSpec model is **intentionally simplified for internship scope** while preserving explicit consistency validation and repair. All extensions are **backward compatible** — older specs without optional fields still validate.

| Area | Simplified model | Optional extensions |
|------|------------------|---------------------|
| **Page ↔ API** | Path substring heuristic | `apiEndpoints[].boundEntity` for explicit entity binding |
| **Intent transparency** | `assumptions[]` + `warnings[]` + confidence metadata | Scope narrowing, overscope, unsupported integrations, and heuristic `confidence` / `ambiguityLevel` surfaced in AppSpec intent (visible in UI) |
| **Auth** | Roles + strategy | `auth.permissions[]` — lightweight entity/role/actions (not a full RBAC engine) |
| **Workflows** | `trigger` string + `steps[]` | `triggerMeta`, `stepMeta[]` for entity/event and integration payload hints |
| **DataSchema** | `tenant_id` field, snake_case tables | Bidirectional relation repair + cross-stage alignment with `schemaGeneration` |

Validation runs at each stage; repair strategies fix common drift before retry.

## Design decisions

These choices are deliberate for internship scope and reviewer accessibility — not omissions.

| Decision | Rationale |
|----------|-----------|
| **Mock fallback** | Reviewers can clone, run, and evaluate without API keys or billing. When a provider call fails or keys are missing, the gateway returns deterministic mocks so the pipeline, validation, and repair paths always remain testable end-to-end. Mock fallback is **intentional** for reproducible evaluation and no-key demos — not a hidden failure mode. |
| **Provider execution transparency** | Each pipeline stage records optional `providerExecutions` on the job (`live`, `mock`, or `fallback`, plus model, latency, and `fallbackReason` when applicable). The **pipeline progress** list and **AppSpec** panel show compact rows such as `Groq • live` or `Gemini • fallback(mock)` so reviewers can see whether output came from a live API call or mock fallback. |
| **Implementation-ready integration stubs** | Five registry connectors (Slack, Gmail, Stripe, Jira, WhatsApp/Twilio) ship with typed `inputSchema` / `outputSchema`, payload validation, and stub adapters. This demonstrates integration architecture without live OAuth, webhooks, or vendor sandboxes in scope. |
| **Assumptions over blocking clarification UX** | `clarificationRequired` is always `false` by schema contract. The system prefers **assumption-driven first-pass generation** over blocking clarification, while surfacing `confidence`, `ambiguityLevel`, and optional `clarificationReason` on the intent so reviewers see *how* ambiguous the prompt was — not a conversational clarification step. |
| **Simplified workflow and auth models** | Workflows use flat `trigger` + `steps[]` (optional `triggerMeta` / `stepMeta`). Auth uses strategy + roles (+ optional lightweight `permissions[]`), not a full RBAC engine — enough for consistency validation and repair without over-building policy runtime. |

## Reviewer notes

The pipeline does not silently discard user intent. Scope and integration decisions are surfaced on the final AppSpec under **Warnings** and **Assumptions** in the output panel (and in `intent.warnings[]` / `intent.assumptions[]` in JSON).

| Prompt type | What happens |
|-------------|----------------|
| **Vague** (e.g. `An app.`) | Defaults to SaaS MVP entities; assumptions list multi-tenant auth, email/password, REST API. No crash; valid AppSpec. |
| **Overscoped** (many features / domains) | MVP-first architecture; warning that scope is broad; assumptions note large-scope handling. |
| **Conflicting domains** (e.g. CRM + ecommerce + ERP + blockchain) | Conflicting prompts are **narrowed deterministically** into an MVP-first coherent domain while exposing `detectedDomains`, `prioritizedDomain`, and `prioritizationReason` in the AppSpec intent (UI: **Domain prioritization** panel). Keyword scoring + fixed tie-break (CRM → ecommerce → ERP → marketplace → blockchain); assumptions and warnings preserved. |
| **Unsupported integrations** (e.g. Telegram, Discord, SAP) | Unsupported integrations are preserved as structured metadata (`requestedIntegrations`, `supportedIntegrations`, `skippedIntegrations`) and surfaced explicitly in the UI instead of silently discarded. Warnings and assumptions remain; only registry IDs wire into `integrationsRequested` / AppSpec hooks. |

With API keys, LLM output may differ in detail, but the same enrichment runs on the intent stage so transparency fields remain populated.

**Provider execution mode** is surfaced in the UI for every completed stage (see **Provider execution** in the AppSpec panel and per-stage labels in the pipeline list). Modes: `live` (SDK succeeded), `mock` (no API key), `fallback` (SDK error or routed fallback provider with mock output).

**Confidence metadata (heuristic, not ML):**

| Field | Example |
|-------|---------|
| `confidence` | `0.45` (vague) → `0.92` (clear CRM) |
| `ambiguityLevel` | `high` / `medium` / `low` |
| `clarificationReason` | e.g. “Prompt is vague; assumptions applied for MVP generation” |

`clarificationRequired` stays `false` — metadata explains reasoning without blocking the pipeline.

## Failure recovery

Every stage output passes through validation before the job advances. On failure:

1. **Validation** — Zod structural checks plus domain rules (entities, `tenant_id`, page↔API binding, integration registry, cross-stage schema alignment, etc.). Errors are structured (`code`, `message`, `path`, `stageId`) and never throw.
2. **Repair** — Up to **3 attempts** (`MAX_REPAIR_ATTEMPTS`), strategies applied in order:
   - **Structural** — JSON / shape recovery from raw stage output when parse errors exist
   - **Field** — `tenant_id`, snake_case tables, relation cleanup, reverse-edge repair
   - **Consistency** — page/API binding, registry integrations, workflow refs, cross-stage `dataSchema` alignment
   - **LLM correction** — optional provider call when deterministic repair is insufficient (skipped in mock-only runs)
3. **Logs** — Each attempt appends to `repairLog.entries` (strategy, outcome, latency, `inputError` snapshot). Successful jobs **preserve** the log; the UI **Error / repair** panel shows rounds for debugging.

If repair exhausts attempts, the job finalizes as `failed` with validation errors and partial logs — no infinite retry loop.

## Testing

### Automated regression

```bash
npm run lint && npm run build && npm run evaluate && npm run test:adversarial
```

Expect **12/12** evaluate + **3/3** adversarial repair — results in `evaluation/results.json`, `evaluation/summary.md`, and [docs/adversarial-results.md](docs/adversarial-results.md).

### Copy-paste reviewer prompts

Use these in the UI prompt box to verify expected behavior (mock mode is sufficient).

| Prompt | Expected behavior |
|--------|-------------------|
| `Build a CRM for real estate agents to track listings, buyers, and deal pipeline stages. Send Slack notifications when deals move stages.` | CRM entities and pages; **Slack** in spec integrations; valid AppSpec; few or no warnings. |
| `Ecommerce store with Stripe payments and Gmail order confirmations.` | Ecommerce entities; **Stripe** + **Gmail** hooks; checkout/order flows in features. |
| `Send Telegram + Discord webhook + SAP integration` | **No crash**; empty or registry-only `integrations`; **warnings** for Telegram, Discord, SAP; assumption that unsupported integrations were skipped. |
| `Build a CRM + ecommerce + school ERP + blockchain voting platform` | **No crash**; output **narrowed** (typically CRM-first); **warnings** for multiple domains; assumptions explain scope narrowing and MVP-first architecture. |

Additional edge cases ship in `evaluation/prompts.ts` (vague, overscoped, conflicting roles).

## Tradeoffs

| Choice | Why |
|--------|-----|
| **In-memory job store** | Fast local demo; no Redis dependency. Jobs do not persist across Vercel instances. |
| **SSE + 3s polling** | Serverless may drop SSE on cold instances; poll reconciles UI state. |
| **Heuristic intent enrichment** | With mock fallback, transparency fields are deterministic; live LLM text may vary but enrichment still runs post-intent. |

See [Design decisions](#design-decisions) for mock fallback, integrations, clarification, and simplified models.

## Future improvements

- Durable job store (Redis / Postgres) for multi-instance deploys
- `STRICT_PROVIDER_MODE` to fail when keys are invalid (vs silent mock)
- Live integration OAuth and webhooks
- Human clarification step for vague prompts

## Deployment

Full guide: [docs/deployment.md](docs/deployment.md)

- Vercel: `npm run build` (see `vercel.json`)
- **No env vars required** for mock mode
- Node.js 20+; API routes use `runtime = "nodejs"`

## Documentation

| Doc | Audience |
|-----|----------|
| [Reviewer guide](docs/reviewer-guide.md) | Recruiters — 1-minute quickstart |
| [Final self-audit](docs/final-self-audit.md) | Requirement map, tradeoffs, confidence summary |
| [Adversarial results](docs/adversarial-results.md) | Prompt + malformed-spec evidence (PASS/FAIL) |
| [Repo health](docs/repo-health.md) | Lint/build/evaluate/adversarial gate results |
| [Deployment](docs/deployment.md) | Vercel setup |
| [Demo prompts](docs/demo-prompts.md) | Best prompts for demos |
| [Demo script](docs/demo-script.md) | 60s walkthrough |
| [Submission checklist](SUBMISSION_CHECKLIST.md) | Pre-submit gates |

## License

Private — internship assignment.
