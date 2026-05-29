# Adversarial Test Log

**Date:** 2026-05-29  
**Environment:** Windows 11, Node 20+, mock provider fallback (no valid API keys / connection errors)

Methods: API Zod validation, in-process `npm run evaluate`, code-path review, and UI client guards.

---

## Input boundary tests

| Test case | Result | Repaired? | Failure mode | Mitigation |
|-----------|--------|-----------|--------------|------------|
| Empty prompt (`""`) | **Blocked** — client shows "Enter a description"; API returns 400 `VALIDATION_ERROR` | N/A | User cannot start job | Zod `.trim().min(1)` on POST body |
| Whitespace-only (`"   "`) | **Blocked** — same as empty after trim | N/A | No job created | `.trim()` on schema |
| Huge prompt (>10,000 chars) | **Blocked** — client counter hits limit; API 400 if bypassed | N/A | Request rejected | `MAX_PROMPT_LENGTH` shared constant |
| 2,001–10,000 char prompt | **Accepted** — runs in mock mode | Sometimes | Slower latency | Length cap prevents abuse |
| Malformed JSON in prompt text | **Accepted** — treated as natural language | N/A | None — not parsed as JSON at input | Intent stage extracts structure |
| Emoji-heavy prompt (`🚀 CRM 📊`) | **Accepted** — evaluate + manual | No | None observed | UTF-8 end-to-end |
| Vague prompt (`"An app."`) | **Success** — evaluation id `vague-an-app` | No | Generic AppSpec | Mock heuristics + defaults |
| Conflicting domain (`CRM + PM + invoicing…`) | **Success** — evaluation id `crm-pm-invoice-conflict` | No | May merge roles loosely | Validation + repair if schema invalid |
| Overscoped marketplace prompt | **Success** — evaluation id `overscoped-marketplace` | No | Large spec surface | Validation caps unrealistic graphs |
| Integration typo (`Slak` vs `Slack`) | **Accepted** — may omit Slack hook | Partial | Missing integration in output | Registry validation on generated spec; repair can add valid IDs |
| Unknown integration name in prompt | **Accepted** | Partial | `unknown_integration` validation if hallucinated | Repair `consistency` + registry check |

---

## Provider / pipeline tests

| Test case | Result | Repaired? | Failure mode | Mitigation |
|-----------|--------|-----------|--------------|------------|
| Missing all API keys | **Success** — deterministic mock | N/A | Logs warn "SDK call failed — falling back to mock" | `base-adapter.ts` mock path |
| Invalid API key (connection error) | **Success** — mock fallback | N/A | Silent degradation vs hard fail | Documented tradeoff; cost panel shows mock |
| Provider timeout simulation | **Fallback** — OpenRouter or mock per routing | Sometimes | Stage retry / fallback provider | `ai-gateway.ts` error classification |
| Invalid JSON from provider | **Retry then repair** | Yes | Parse error on structured output | `parse-structured.ts` correction retry + repair engine |
| Repair exhaustion (3 attempts) | **Failed job** | No | `generation_complete` without AppSpec | UI: StatusBanner + validation list |
| Double-click Generate | **Safe** — prior SSE/poll cleaned up | N/A | Race on job state | `cleanupRef` in `use-generation.ts` |
| SSE disconnect mid-run | **Recovered** — 3s polling fetches job | N/A | Stale UI | Poll fallback + `fetchJob` on complete |

---

## API / security tests

| Test case | Result | Repaired? | Failure mode | Mitigation |
|-----------|--------|-----------|--------------|------------|
| POST `/api/generate` non-JSON body | **400** `VALIDATION_ERROR` | N/A | No job | `.catch(() => null)` + Zod safeParse |
| Invalid `jobId` path | **404** | N/A | — | Job store lookup |
| Secrets in repo | **None found** — `.env*` gitignored, example only | N/A | — | `.gitignore` + review |

---

## Evaluation suite (automated adversarial subset)

All 12 prompts in `evaluation/prompts.ts` including 5 edge cases:

| Result | Count |
|--------|-------|
| Success | 12 |
| Failed | 0 |
| Avg latency | ~3211ms |

Edge prompts exercised: vague, Notion-like, overscoped, conflicting roles, "smart" vague ML claim.

---

## UI states verified

| State | Behavior |
|-------|----------|
| No prompt submitted | Dashed `StatusBanner` hint |
| Running | Amber "Generation in progress" + pipeline stage UI |
| Failed | Red banner + scrollable validation errors |
| Missing output | AppSpec card explains failure vs idle |
| Success | Green success banner + populated AppSpec tables |

---

## Recommended manual checks before demo

1. Run with at least one real API key and confirm non-mock cost metadata.
2. Open SSE in Network tab during one generation.
3. Deploy preview on Vercel with env vars from `.env.example`.
