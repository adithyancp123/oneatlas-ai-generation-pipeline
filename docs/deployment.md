# Deployment Guide (Vercel)

Deploy the AppSpec Pipeline to Vercel for recruiter demos. The app runs in **mock mode** without API keys; add keys for live provider output.

## Prerequisites

- GitHub repository connected to Vercel
- Node.js 20+ (Vercel default is fine)
- No local-path or Windows-specific configuration in the codebase

## Deploy steps

1. Push the repository to GitHub.
2. In [Vercel Dashboard](https://vercel.com/new) → **Import Project** → select the repo.
3. Framework preset: **Next.js** (auto-detected).
4. Build settings (defaults match `vercel.json`):
   - **Build command:** `npm run build`
   - **Install command:** `npm install`
   - **Output:** Next.js default
5. Environment variables: copy from [`.env.example`](../.env.example). **None are required** for mock mode.
6. Deploy. Open the production URL.

### Optional: production URL in env

| Variable | Example | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Metadata / future absolute links |

## Required vs optional env vars

| Variable | Required? | Notes |
|----------|-----------|-------|
| `OPENAI_API_KEY` | No | Mock fallback if missing or invalid |
| `ANTHROPIC_API_KEY` | No | Same |
| `GROQ_API_KEY` | No | Same |
| `GEMINI_API_KEY` / `GOOGLE_AI_API_KEY` | No | Same |
| `DEEPSEEK_API_KEY` | No | Same |
| `MISTRAL_API_KEY` | No | Same |
| `OPENROUTER_API_KEY` | No | Recommended for universal fallback |
| `*_DEFAULT_MODEL` | No | Routing uses env keys from `src/config/routing.ts` |
| `PIPELINE_MAX_RETRIES` | No | Default `3` |
| `PIPELINE_TIMEOUT_MS` | No | Default `120000` |
| `LOG_LEVEL` | No | Default `info`; invalid values fall back safely |

Startup uses `getEnv()` with **safe parse** — malformed optional env does not crash the server.

## Vercel compatibility notes

| Feature | Status |
|---------|--------|
| `npm run build` | Verified locally |
| Relative API routes (`/api/generate`) | No hardcoded host |
| Provider SDKs | Listed in `serverExternalPackages` in `next.config.ts` |
| Background jobs | `after()` from `next/server` extends serverless lifecycle after 202 response |
| SSE stream route | `maxDuration: 60` on generate + stream routes |
| Mock fallback | Works when keys absent or SDK connection fails |

## Troubleshooting

### Generation stuck on “in progress”

- **Cause:** Serverless instance mismatch — in-memory `JobStore` is not shared across all lambdas.
- **Mitigation:** Client polls every 3s (`use-generation.ts`). Refresh and retry once.
- **Demo tip:** Run locally (`npm run dev`) for the most reliable SSE demo.

### `JOB_NOT_FOUND` on stream or poll

- Job was created on a different instance than the one serving SSE/poll.
- Retry generation; keep traffic on a single warm instance when possible.

### Build fails on Vercel

- Ensure **Root Directory** is the repo root (where `package.json` lives).
- If a parent folder has another `package-lock.json`, set root to this project only.
- `outputFileTracingRoot` in `next.config.ts` pins tracing to this app.

### Middleware deprecation warning

- Next.js 16 warns about `middleware.ts` → `proxy`. Non-blocking for deploy.

### Provider always shows mock cost

- Keys missing, invalid, or network blocked → intentional mock fallback.
- Add a valid `OPENAI_API_KEY` (or other routed provider) in Vercel env and redeploy.

## Limitations (document for reviewers)

1. **In-memory job store** — jobs and SSE events do not persist across instances or cold starts.
2. **Not horizontally scalable** without Redis/Postgres — acceptable for internship demo.
3. **Hobby plan timeout** — pipeline targets ~3s in mock mode; Pro plan `maxDuration: 60` is configured for headroom.
4. **Integration OAuth** — metadata only; no live Slack/Stripe connections in this repo.

## Verify before sharing URL

```bash
npm run build
npm start
# open http://localhost:3000 and run one generation
```

Or rely on Vercel’s build log showing a successful `next build`.

## Related docs

- [Demo script](demo-script.md)
- [Reviewer guide](reviewer-guide.md)
- [Submission checklist](../SUBMISSION_CHECKLIST.md)
