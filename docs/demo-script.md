# 60-Second Demo Script

Use this for a screen recording or live walkthrough. Speak plainly; no marketing fluff.

---

## 0:00 — Open app

> “This is the AppSpec Pipeline — natural language in, validated machine-readable spec out.”

- Open `http://localhost:3000` or your Vercel URL.
- Point out: prompt area, Generate button, pipeline status panel.

---

## 0:10 — Enter CRM prompt

Paste:

```text
Build a CRM for real estate agents to track listings, buyers, and deal pipeline stages.
```

> “One sentence describes the product; the pipeline does the rest.”

Click **Generate**.

---

## 0:20 — Live SSE progress

- Open DevTools → **Network** → filter `stream` (optional but impressive).
- Point at **Pipeline status**: `intentExtraction` → `schemaGeneration` → `appSpecGeneration`.
- Say: “Stages stream over SSE; the client also polls as a serverless fallback.”

---

## 0:35 — AppSpec output

- Scroll to **AppSpec** card: name, description, app type.
- Expand entities, pages, API endpoints tables.
- Say: “Output is validated — not raw JSON dumped on screen.”

---

## 0:45 — Integrations

- Scroll to integrations section (if present in spec) or mention registry.
- Optional second prompt with Slack (see [demo-prompts.md](demo-prompts.md)) if time allows.

> “Integrations are checked against a registry — invalid hooks get caught in validation.”

---

## 0:50 — Repair + evaluation

> “If validation fails, a repair engine runs structural, field, and consistency fixes before retrying.”

- Mention: `npm run evaluate` — 12 prompts, 100% pass in mock mode.
- Point to `evaluation/summary.md` in the repo if showing code.

---

## 0:55 — Routing + fallback

> “Models are config-driven in `routing.ts` — stages never hardcode provider names.”

> “Missing API keys fall back to deterministic mocks so reviewers can run without secrets.”

---

## 1:00 — Close

> “Clone, `npm install`, `npm run dev` — under five minutes. Full checklist in SUBMISSION_CHECKLIST.md.”

---

## Backup lines if something fails on Vercel

- “Serverless uses in-memory jobs — I’ll retry once; polling should catch up.”
- “Switching to local demo — same codebase, `npm run dev`.”
