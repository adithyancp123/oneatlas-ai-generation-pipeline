# Submission Checklist

Use this before opening the PR or sharing the repo link.

## Build & quality

- [x] `npm install` completes without errors
- [x] `npm run lint` — zero warnings
- [x] `npm run build` — production build succeeds
- [x] `npm run evaluate` — 12/12 prompts pass (see `evaluation/summary.md`)

## Documentation

- [x] `README.md` — clone → install → env → run → test → deploy in &lt; 5 minutes
- [x] `.env.example` — committed and matches `src/config/env.ts`
- [x] `docs/reviewer-guide.md` — recruiter quick path
- [x] `docs/deployment.md` — Vercel deploy + troubleshooting
- [x] `docs/demo-script.md` — 60s walkthrough
- [x] `docs/demo-prompts.md` — demo + edge prompts
- [x] `docs/final-audit.md` — audit log
- [x] `docs/adversarial-tests.md` — adversarial outcomes
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
- [ ] Update README screenshot table with real images
- [ ] Replace `YOUR_USERNAME/YOUR_REPO` in README Vercel button URL
- [ ] (Optional) Vercel preview URL in README or PR description
- [x] Evaluation results committed (`evaluation/summary.md`, `evaluation/results.json`)

## Reviewer quick start

```bash
git clone <repo>
cd assignment5
cp .env.example .env.local
npm install
npm run dev
# optional: npm run evaluate
```

---

**Last verified:** 2026-05-29 — lint, build, evaluate all passing.
