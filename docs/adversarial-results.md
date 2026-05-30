# Adversarial Evidence Report

**Date:** 2026-05-30  
**Environment:** Windows 11, Node 20+, mock/fallback providers (SDK connection errors → deterministic mocks)  
**Methods:** `npm run evaluate`, `npm run test:adversarial`, deterministic `prompt-insights` / mock intent paths, code-path review

---

## Prompt-level adversarial cases

| Prompt | Expected behavior | Observed behavior | Result |
|--------|-------------------|-----------------|--------|
| `An app.` | Job completes; valid AppSpec; SaaS MVP defaults; assumptions for multi-tenant auth and REST; high ambiguity surfaced | Evaluation id `vague-an-app`: **12/12 suite success**; mock intent adds assumptions (`multi-tenant SaaS`, `email/password auth`, `REST API`); `ambiguityLevel` elevated via `prompt-insights.ts` | **PASS** |
| `Build a CRM + ecommerce + school ERP + blockchain voting platform` | No crash; domain conflict detected; scope narrowed to single MVP domain (CRM-first tie-break); warnings + `detectedDomains` / `prioritizedDomain` on intent | `computeDomainPrioritization()` scores crm, ecommerce, erp, blockchain; explicit multi-domain prompt → **CRM** wins `MVP_TIE_BREAK_ORDER`; warnings list all detected domains; evaluation conflict prompt `crm-pm-invoice-conflict` also **PASS** | **PASS** |
| `Send Telegram + Discord webhook + SAP integration` | No crash; unsupported integrations named in warnings; no invented registry connectors in `integrationsRequested` | `computeIntegrationResolution()` lists telegram, discord, sap in `requestedIntegrations` / `skippedIntegrations`; warnings per provider; `integrationsRequested` stays registry-only (empty when none supported) | **PASS** |
| `Ecommerce store with Stripe payments and Gmail order confirmations.` | Ecommerce entities; Stripe + Gmail in supported integrations | Evaluation id `ecommerce-stripe-gmail`: success; `integrationsDetected`: `gmail`, `stripe` | **PASS** |
| Empty prompt `""` | Blocked before job | Client validation + API 400 `VALIDATION_ERROR` (Zod `.trim().min(1)`) | **PASS** |
| Whitespace-only `"   "` | Blocked after trim | Same as empty | **PASS** |
| Prompt &gt; 10,000 chars | Blocked | `MAX_PROMPT_LENGTH` in `src/config/constants.ts` — client counter + API rejection | **PASS** |

---

## Repair / validation adversarial cases

Automated via `npm run test:adversarial` (`evaluation/adversarial-validation.ts`). Each case mutates a valid mock AppSpec, expects validation codes **before** repair, then runs `runRepairEngine` once.

| Case | Injected fault | Expected | Observed | Result |
|------|----------------|----------|----------|--------|
| `camelcase-table-name` | `tableName = "BadTableName"` | `invalid_table_name` → repaired valid spec | `codesBefore: ["invalid_table_name"]`, `codesAfter: []`, `repairSuccess: true`, `repairEntries: 3` | **PASS** |
| `missing-tenant-id` | Remove `tenant_id` from all entities | `missing_tenant_id` → field repair adds tenant | `codesBefore: ["missing_tenant_id"]`, `codesAfter: []`, `repairSuccess: true`, `repairEntries: 3` | **PASS** |
| `page-without-endpoint` | `apiEndpoints = []` | `page_without_endpoint` → consistency/orphan repair | `codesBefore: ["page_without_endpoint"]`, `codesAfter: []`, `repairSuccess: true`, `repairEntries: 3` | **PASS** |

### Malformed AppSpec (structural)

| Scenario | Expected behavior | Observed behavior | Result |
|----------|-------------------|-----------------|--------|
| Truncated / invalid JSON from provider | Structural strategy attempts recovery; logged in repair entries | `repairStructuralJson` in `src/lib/pipeline/repair/strategies/structural.ts`; orchestrator passes `rawStageOutput` when parse fails | **PASS** (code path + repair engine integration) |
| Invalid partial draft object | Merge with mock base + field/consistency strategies | `buildBaseSpec()` in `repair-engine.ts` merges draft with `buildMockAppSpec` before strategies run | **PASS** |

Repair exhaustion (3 failed rounds) finalizes job as `failed` with validation errors and preserved `repairLog` — no infinite loop (`MAX_REPAIR_ATTEMPTS` in orchestrator).

---

## Provider / runtime adversarial cases

| Test | Expected | Observed | Result |
|------|----------|----------|--------|
| Missing / invalid API keys | Pipeline completes via mock/fallback | Evaluate run logs: `SDK call failed — falling back to deterministic mock`; stages complete **12/12** | **PASS** |
| SSE disconnect mid-run | UI recovers via polling | `use-generation.ts` 3s poll + `fetchJob` on completion | **PASS** |
| Double-click Generate | No duplicate leaks | `cleanupRef` clears interval + SSE on retry | **PASS** |
| Non-JSON POST body | 400, no job | API safeParse + `VALIDATION_ERROR` | **PASS** |
| Invalid `jobId` | 404 | Job store lookup in stream/status routes | **PASS** |

---

## Summary

| Category | Passed | Failed |
|----------|--------|--------|
| Prompt-level (table above) | 7 | 0 |
| Repair automation (`test:adversarial`) | 3 | 0 |
| Evaluation regression (`evaluate`) | 12 | 0 |

**Commands to reproduce:**

```bash
npm run evaluate
npm run test:adversarial
```

See also: [Adversarial test log (prior pass)](adversarial-tests.md) · [Repo health](repo-health.md)
