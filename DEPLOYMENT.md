# Deployment (Vercel)

Deploy the AppSpec Pipeline for the OneAtlas submission. **Mock mode works with zero API keys** — reviewers can generate AppSpecs without billing or provider accounts.

**Production region:** Singapore (`sin1`) — configured in [`vercel.json`](vercel.json).

---

## 1. Push to GitHub

```bash
git add .
git commit -m "feat: complete OneAtlas trial — pipeline, repair engine, validation, SSE, eval log"
git push origin main
```

Repository: [https://github.com/adithyancp123/oneatlas-ai-generation-pipeline](https://github.com/adithyancp123/oneatlas-ai-generation-pipeline)

---

## 2. Import in Vercel

1. Open [vercel.com/new](https://vercel.com/new).
2. **Import** `adithyancp123/oneatlas-ai-generation-pipeline` (or your fork).
3. Framework preset: **Next.js** (auto-detected from `vercel.json`).
4. Root directory: repository root (where `package.json` lives).
5. Build settings (defaults — do not change unless needed):
   - **Install command:** `npm install`
   - **Build command:** `npm run build`
6. Click **Deploy** (you can add env vars before or after the first deploy).

---

## 3. Environment variables (Vercel dashboard)

Go to **Project → Settings → Environment Variables**. Copy names from [`.env.example`](.env.example).

**Required for mock mode:** none. Leave all keys empty or unset — the AI gateway uses deterministic mocks.

**Optional — live LLM output:** add any provider keys you have. Apply to **Production**, **Preview**, and **Development** as needed.

### Application

| Variable | Required? | Description |
|----------|-----------|-------------|
| `NODE_ENV` | No | Usually set automatically by Vercel (`production`) |
| `NEXT_PUBLIC_APP_URL` | Recommended | Your Vercel URL, e.g. `https://oneatlas-ai-generation-pipeline.vercel.app` |

### AI provider API keys (all optional)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic |
| `GROQ_API_KEY` | Groq (intent stage primary) |
| `GEMINI_API_KEY` | Google Gemini (schema stage primary) |
| `GOOGLE_AI_API_KEY` | Alternate Gemini key |
| `DEEPSEEK_API_KEY` | DeepSeek |
| `OPENROUTER_API_KEY` | OpenRouter universal fallback |
| `MISTRAL_API_KEY` | Mistral |

### Model overrides (optional)

| Variable | Description |
|----------|-------------|
| `OPENAI_DEFAULT_MODEL` | Default OpenAI model name |
| `ANTHROPIC_DEFAULT_MODEL` | Default Anthropic model name |
| `GROQ_DEFAULT_MODEL` | Default Groq model name |
| `GEMINI_DEFAULT_MODEL` | Default Gemini model name |
| `MISTRAL_DEFAULT_MODEL` | Default Mistral model name |
| `OPENROUTER_DEFAULT_MODEL` | Default OpenRouter model (e.g. `openrouter/auto`) |
| `DEEPSEEK_DEFAULT_MODEL` | Default DeepSeek model name |
| `INTENT_EXTRACTION_MODEL_OVERRIDE` | Force model for intent stage |
| `SCHEMA_GENERATION_MODEL_OVERRIDE` | Force model for schema stage |
| `APP_SPEC_GENERATION_MODEL_OVERRIDE` | Force model for AppSpec stage |
| `REPAIR_MODEL_OVERRIDE` | Force model for repair LLM calls |

### Pipeline (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `PIPELINE_MAX_RETRIES` | `3` | Max repair attempts |
| `PIPELINE_TIMEOUT_MS` | `120000` | Pipeline timeout (ms) |
| `ENABLE_COST_TRACKING` | `true` | Per-stage cost on job |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |

After adding `NEXT_PUBLIC_APP_URL`, **redeploy** so the client picks up the production URL.

---

## 4. Deploy and verify

1. Trigger **Redeploy** if you changed env vars.
2. Open the production URL (e.g. `https://<project>.vercel.app`).
3. Enter a prompt → **Generate** → confirm pipeline stages complete and AppSpec appears.
4. Optional smoke test (local, against production):

   ```bash
   EVAL_BASE_URL=https://<your-project>.vercel.app npx tsx evaluation/run-eval.ts
   ```

---

## Vercel project settings (reference)

| Setting | Value |
|---------|--------|
| Framework | Next.js (`vercel.json`) |
| Region | `sin1` (Singapore) |
| API `maxDuration` | 60s (`vercel.json` + `export const maxDuration = 60` on routes) |
| SSE | `GET /api/generate/[jobId]/stream` — requires 60s limit |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Confirm root directory; run `npm run build` locally |
| Generation stuck | Serverless uses in-memory jobs — refresh; client polls every 3s |
| `JOB_NOT_FOUND` on stream | Retry generation (instance mismatch on cold start) |
| SDK errors in logs | Expected without keys — mock fallback is intentional |
| SSE drops | Use poll fallback in UI; keep one warm instance for demos |

---

## CLI deploy (optional)

```bash
npm i -g vercel
vercel login
vercel link
vercel --prod
```

Set env vars with `vercel env add` or the dashboard.
