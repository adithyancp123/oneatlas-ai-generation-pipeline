# Demo Prompts

Curated prompts for recordings and live demos. All succeed in **mock mode** (no API keys).

---

## Best prompts (5) — use for happy path

### 1. CRM (default demo)

```text
Build a CRM for real estate agents to track listings, buyers, and deal pipeline stages.
```

| Expected | |
|----------|--|
| App type | `crm` or similar |
| Entities | listings, buyers, deals/pipeline |
| Integrations | None required |
| Latency | ~3s mock |

### 2. Slack task manager

```text
Create a task manager that sends Slack notifications when tasks become overdue.
```

| Expected | |
|----------|--|
| Integrations | `slack` with valid registry trigger/action |
| Workflows | Notification on overdue |

### 3. Ecommerce + payments

```text
Ecommerce store with Stripe payments and Gmail order confirmations.
```

| Expected | |
|----------|--|
| Integrations | `stripe`, `gmail` |
| Pages | catalog, checkout, orders |

### 4. HR approvals

```text
Build an HR tool where leave requests trigger Slack approval workflows.
```

| Expected | |
|----------|--|
| Integrations | `slack` |
| Auth | roles for employee / manager |

### 5. Inventory alerts

```text
Design an inventory system that emails managers when stock is low.
```

| Expected | |
|----------|--|
| Integrations | `gmail` |
| Entities | products, stock levels |

---

## Edge-case prompts (3) — show robustness

### 1. Vague

```text
An app.
```

| Expected | |
|----------|--|
| Result | Generic AppSpec with defaults |
| Repaired? | Usually no — passes validation via mocks |
| Note | Say: “Pipeline still produces a valid minimal spec.” |

### 2. Overscoped

```text
A marketplace with auctions, crypto payments, AI recommendations, social feed, and vendor dashboards.
```

| Expected | |
|----------|--|
| Result | Large but valid spec surface |
| Note | Validation constrains unrealistic integration IDs |

### 3. Conflicting roles

```text
CRM + project management + invoicing in one tool with conflicting admin roles.
```

| Expected | |
|----------|--|
| Result | Merged spec; may simplify roles |
| Note | Repair may run if auth/page consistency fails |

---

## Prompts to avoid live

| Prompt | Why |
|--------|-----|
| Empty / whitespace | Blocked by UI + API |
| >10,000 characters | Blocked by `MAX_PROMPT_LENGTH` |
| `Slak` typo only | May omit Slack — use clear “Slack” for integration demo |

---

## Evaluation overlap

All standard and edge prompts above are in `evaluation/prompts.ts`. Run:

```bash
npm run evaluate
```

See `evaluation/summary.md` for latest metrics.
