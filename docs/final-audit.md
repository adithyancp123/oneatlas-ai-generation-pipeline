# Final Pre-Submission Audit

**Date:** 2026-05-29  
**Scope:** Engineering polish only — no architecture rewrite.

## Summary

| Severity | Found | Auto-fixed | Deferred |
|----------|-------|------------|----------|
| High | 2 | 2 | 0 |
| Medium | 6 | 5 | 1 |
| Low | 8 | 4 | 4 |

---

## Issues

### 1. `.gitignore` blocked `.env.example`

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Issue** | Pattern `.env*` ignored the example env file reviewers need. |
| **Fix applied** | Allow `!.env.example`; keep `.env.local` ignored. |
| **Deferred** | — |

### 2. Dead type module `src/types/ai.ts`

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Issue** | Legacy types duplicated `src/lib/ai/gateway/types.ts`; unused imports risk. |
| **Fix applied** | File removed. |
| **Deferred** | — |

### 3. SSE / poll interval leak in `use-generation.ts`

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Issue** | Interval and SSE unsubscribe not cleared on unmount or re-generate. |
| **Fix applied** | `cleanupRef` clears interval + unsubscribe on retry and completion. |
| **Deferred** | — |

### 4. Catastrophic orchestrator failure without terminal SSE

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Issue** | UI could hang if orchestrator threw before `generation_complete`. |
| **Fix applied** | `orchestrator.ts` emits `generation_complete` with failed status on catch. |
| **Deferred** | — |

### 5. Duplicate `usePipeline()` in `AppSpecViewer`

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Issue** | Two hook calls in one component. |
| **Fix applied** | Single destructured call. |
| **Deferred** | — |

### 6. Prompt length enforced inconsistently

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Issue** | Magic `10_000` in client/API separately. |
| **Fix applied** | `MAX_PROMPT_LENGTH` in `src/config/constants.ts`; shared by API, hook, and `PromptInput` with counter. |
| **Deferred** | — |

### 7. Weak empty / loading UX

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Issue** | Generic AppSpec placeholder; no idle/running/success banners. |
| **Fix applied** | `StatusBanner`, contextual `AppSpecViewer` messages, improved `ErrorBanner` typography. |
| **Deferred** | — |

### 8. Missing React error boundaries

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Issue** | Uncaught render errors could blank the page. |
| **Fix applied** | `src/app/error.tsx`, `src/app/global-error.tsx`. |
| **Deferred** | — |

### 9. Unused npm dependencies

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Issue** | `@google/genai`, `eventsource-parser` not referenced in `src/`. |
| **Fix applied** | — |
| **Deferred** | Remove in a follow-up to avoid lockfile churn before submit; Gemini uses `@google/generative-ai`. |

### 10. In-memory job store on serverless

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Issue** | Jobs do not persist across Vercel instances; SSE may miss events if routed to another instance. |
| **Fix applied** | Client polling fallback (3s) when SSE degrades. |
| **Deferred** | Redis / durable store — out of assignment scope. |

### 11. Mock fallback masks invalid API keys

| Field | Value |
|-------|-------|
| **Severity** | Low (by design) |
| **Issue** | Reviewers with bad keys see mocks, not hard failures. |
| **Fix applied** | Documented in README and evaluation notes. |
| **Deferred** | Optional `STRICT_PROVIDER_MODE` env — not added to avoid behavior change. |

### 12. Next.js 16 middleware deprecation warning

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Issue** | Build warns: use `proxy` instead of `middleware`. |
| **Fix applied** | — |
| **Deferred** | Migrate when Next.js docs stabilize; current middleware is minimal. |

### 13. No `TODO` / `FIXME` / lint suppressions in `src/`

| Field | Value |
|-------|-------|
| **Severity** | Info |
| **Issue** | N/A — clean scan. |
| **Fix applied** | — |
| **Deferred** | — |

### 14. `repairAppSpec` deprecated alias

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **Issue** | Repair stage used legacy export. |
| **Fix applied** | `repair` stage uses `runRepairEngine`. |
| **Deferred** | Remove alias in future refactor. |

---

## Verification (mandatory)

| Command | Result |
|---------|--------|
| `npm run lint` | Pass (0 warnings) |
| `npm run build` | Pass |
| `npm run evaluate` | Pass — 12/12 (100%) |

---

## Files touched in audit pass

- `.gitignore`
- `docs/final-audit.md` (this file)
- `docs/adversarial-tests.md`
- `SUBMISSION_CHECKLIST.md`
- `README.md`
- `src/config/constants.ts`
- `src/app/api/generate/route.ts`
- `src/app/page.tsx`
- `src/app/error.tsx`
- `src/app/global-error.tsx`
- `src/components/status/*`
- `src/components/prompt/prompt-input.tsx`
- `src/components/app-spec/app-spec-viewer.tsx`
- `src/components/errors/error-banner.tsx`
- `src/hooks/use-generation.ts`
- `src/lib/pipeline/orchestration/orchestrator.ts`
- Removed: `src/types/ai.ts`
