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
| Repair | `src/lib/pipeline/repair/` | Structural, field, consistency, optional LLM |
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
npm run lint       # ESLint, zero warnings
npm run build      # Production build
npm run evaluate   # 12-prompt regression → evaluation/results.json
```

Latest evaluation: **12/12 success** — see [evaluation/summary.md](evaluation/summary.md).

## Tradeoffs

| Choice | Why |
|--------|-----|
| **In-memory job store** | Fast local demo; no Redis dependency. Jobs do not persist across Vercel instances. |
| **Mock fallback** | Reviewers run without secrets; evaluation always completes. |
| **SSE + 3s polling** | Serverless may drop SSE on cold instances; poll reconciles UI state. |
| **Integrations stubbed** | Registry + validation are real; live OAuth/webhooks are out of scope. |

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
| [Deployment](docs/deployment.md) | Vercel setup |
| [Demo prompts](docs/demo-prompts.md) | Best prompts for demos |
| [Demo script](docs/demo-script.md) | 60s walkthrough |
| [Submission checklist](SUBMISSION_CHECKLIST.md) | Pre-submit gates |

## License

Private — internship assignment.
