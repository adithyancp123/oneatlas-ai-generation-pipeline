# Repository Health Report

**Date:** 2026-05-30  
**Machine:** Windows 11, Node 20+  
**Branch:** local workspace (`assignment5`)

---

## Command results (fresh run)

| Command | Result | Notes |
|---------|--------|-------|
| `npm run lint` | **PASS** | ESLint, `--max-warnings 0`, zero warnings |
| `npm run typecheck` | **PASS** | `tsc --noEmit` |
| `npm run build` | **PASS** | Next.js 16.2.6 production build |
| `npm run evaluate` | **PASS** | **12/12** (100%) — see `evaluation/summary.md` |
| `npm run test:adversarial` | **PASS** | **3/3** repair cases |

### Evaluate snapshot

| Metric | Value |
|--------|-------|
| Ran at | 2026-05-30T09:29:29.286Z |
| Success rate | 100% (12/12) |
| Average latency | 3045 ms |
| Average token cost | $0.0087 |
| Failed runs | 0 |

Artifacts: `evaluation/results.json`, `evaluation/summary.md`

### Adversarial repair snapshot

```
camelcase-table-name   → PASS (invalid_table_name repaired)
missing-tenant-id      → PASS (missing_tenant_id repaired)
page-without-endpoint  → PASS (page_without_endpoint repaired)
```

---

## TypeScript strictness

From `tsconfig.json`:

| Flag | Enabled |
|------|---------|
| `strict` | yes |
| `noUncheckedIndexedAccess` | yes |
| `noImplicitOverride` | yes |
| `noUnusedLocals` | yes |
| `noUnusedParameters` | yes |
| `exactOptionalPropertyTypes` | yes |
| `allowJs` | no |

`npm run typecheck` passes with these settings.

---

## Known warnings (non-blocking)

| Source | Warning | Impact | Planned action |
|--------|---------|--------|----------------|
| Next.js build | `middleware` file convention deprecated — use `proxy` | Build succeeds; minimal `src/middleware.ts` still works | Migrate when Next.js proxy docs stabilize (deferred in `docs/final-audit.md`) |
| Evaluate / dev logs | `SDK call failed — falling back to deterministic mock` | Expected without valid keys or network; labeled `fallback` in UI | Documented tradeoff — not a test failure |
| Provider panel | May show all providers as mock/fallback | Reviewer visibility feature | Set real keys in `.env.local` for live mode |

No ESLint warnings. No TypeScript errors. No `TODO` / `FIXME` in `src/`.

---

## Dependency notes

| Package | Role | Note |
|---------|------|------|
| `next@16.2.6` | App framework | App Router, Turbopack build |
| `react@19.2.4` | UI | Matches Next 16 stack |
| `zod@3.24.2` | Validation | AppSpec + API schemas |
| `openai`, `@anthropic-ai/sdk`, `groq-sdk`, `@google/generative-ai`, `@mistralai/mistralai` | LLM providers | Routed via gateway |
| `@google/genai` | — | Listed in `package.json`; Gemini adapter uses `@google/generative-ai` — optional cleanup candidate (no runtime impact) |
| `eventsource-parser` | — | Unused in `src/` — optional removal candidate |
| `tsx` | Dev/eval scripts | Powers `evaluate` and `test:adversarial` |

**Security:** `.env.local` gitignored; `.env.example` committed without secrets. No credentials in tracked source.

---

## Repository hygiene checklist

| Item | Status |
|------|--------|
| Lint clean | yes |
| Production build | yes |
| Evaluation committed | yes |
| Reviewer docs linked from README | yes |
| Error boundaries (`error.tsx`, `global-error.tsx`) | present |
| Screenshots in `docs/screenshots/` | optional — see `SUBMISSION_CHECKLIST.md` |

---

## Related documentation

- [Final self-audit](final-self-audit.md) — requirement mapping
- [Adversarial results](adversarial-results.md) — prompt + repair evidence
- [Reviewer guide](reviewer-guide.md) — 1-minute quickstart
- [Final engineering audit](final-audit.md) — prior polish pass log
