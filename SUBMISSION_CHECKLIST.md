# Submission Checklist

Use this before opening the PR or sharing the repo link.

## OneAtlas assignment requirements

- [x] GitHub repo with clean README ([README.md](README.md) — Quick start, env, architecture, integrations, eval, limitations)
- [x] All env vars documented (README **Environment variables** + [`.env.example`](.env.example) matches `src/config/env.ts`)
- [x] Pipeline architecture described (README **Pipeline architecture**)
- [ ] Live URL or screen recording — [README live demo](README.md) + [DEPLOYMENT.md](DEPLOYMENT.md); deploy to confirm `oneatlas-ai-generation-pipeline.vercel.app` is live
- [x] `evaluation-log.json` present at repo root
- [x] `evaluation-summary.md` present at repo root
- [x] 5 integrations fully implemented (Slack, WhatsApp/Twilio, Gmail, Stripe, Jira — registry + schemas + stub adapters)
- [x] Repair engine with 3 strategies (structural, field, consistency — `src/lib/pipeline/repair/`)
- [x] SSE streaming with event replay (`store.replayEvents()` in `src/app/api/generate/[jobId]/stream/route.ts`)
- [x] Zod validation per stage (`src/lib/pipeline/validators/schemas.ts`)
- [x] Cross-layer validation checks (`validateAppSpec` + `canonicalDataSchema`; `npm run test:cross-layer`)
- [x] Cost logging per stage (`job.cost`, `ENABLE_COST_TRACKING`)
- [x] Model routing config-driven (`src/config/routing.ts` + AI gateway)

## Build & quality

- [x] `npm install` completes without errors
- [x] `npm run lint` — zero warnings
- [x] `npm run build` — production build succeeds (verified 2026-05-30)
- [x] `npm run evaluate` — 12/12 prompts pass (in-process; see `evaluation/results.json`)
- [x] `npx tsx evaluation/run-eval.ts` — 12/12 HTTP eval (see `evaluation-log.json`)
- [x] `npm run test:adversarial` — 3/3 repair cases pass (see `docs/adversarial-results.md`)

## Documentation

- [x] `README.md` — clone → install → env → run in under 5 minutes
- [x] `.env.example` — committed, empty values, matches `src/config/env.ts`
- [x] `docs/reviewer-guide.md` — recruiter quick path
- [x] `docs/deployment.md` — Vercel deploy + troubleshooting
- [x] `docs/demo-script.md` — 60s walkthrough / screen recording
- [x] `docs/demo-prompts.md` — demo + edge prompts
- [x] `docs/final-audit.md` — engineering polish audit log
- [x] `docs/final-self-audit.md` — requirement map + reviewer confidence
- [x] `docs/adversarial-results.md` — adversarial PASS/FAIL evidence
- [x] `docs/repo-health.md` — lint/build/evaluate/adversarial gate report
- [x] `vercel.json` — framework + build commands

## Repository hygiene

- [x] `.gitignore` — `node_modules`, `.next`, `.env.local`, logs; **not** `.env.example`
- [x] No secrets in tracked files
- [x] No stray `*.log` / temp artifacts committed
- [x] Consistent naming (`appspec-pipeline`, `AppSpec`, snake_case tables in spec)

## Deployment

- [x] No Windows-only paths in source
- [x] `NEXT_PUBLIC_APP_URL` documented for Vercel
- [x] Mock mode works with zero API keys
- [x] Error boundaries: `src/app/error.tsx`, `src/app/global-error.tsx`

## Demo readiness

- [ ] Add PNGs to `docs/screenshots/` (see `docs/screenshots/README.md`)
- [ ] Update README Vercel button URL (`YOUR_USERNAME/YOUR_REPO`)
- [x] Vercel preview URL in README (`oneatlas-ai-generation-pipeline.vercel.app` — confirm after deploy)
- [x] Evaluation results committed (`evaluation-log.json`, `evaluation-summary.md`, `evaluation/results.json`)

## Reviewer quick start

```bash
git clone <repo>
cd assignment5
cp .env.example .env.local
npm install
npm run dev
# optional: npx tsx evaluation/run-eval.ts
```

---

**Last verified:** 2026-05-30 — lint ✅, build ✅, HTTP eval **12/12** ✅, in-process evaluate **12/12** ✅, adversarial **3/3** ✅
