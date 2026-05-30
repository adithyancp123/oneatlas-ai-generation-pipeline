# Screenshots

Capture these before submission and reference them in the root [README.md](../../README.md).

## What each screenshot should demonstrate

| File | Demonstrates | Reviewer should see |
|------|----------------|---------------------|
| `home-dashboard.png` | **First impression** — product is a polished dark SaaS dashboard, not a bare form. | Two-column layout (controls left, output right), Prompt card, empty AppSpec state, Integrations registry visible, professional typography and spacing. |
| `generation-flow.png` | **Live feedback** — the app responds immediately after Generate. | Amber “Generation in progress” status banner, loading state on the button, user knows the pipeline is running (SSE/poll active). |
| `pipeline.png` | **Multi-stage architecture** — intent → schema → AppSpec → repair is real, not a single LLM call. | Pipeline card with stage labels, running/complete indicators, optional latency ms; proves staged orchestration. |
| `providers.png` | **Config-driven AI routing** — providers are pluggable and visible. | AI Providers panel: configured vs mock fallback, routing summary mapping stages to models; supports “no API keys required” claim. |
| `appspec-output.png` | **Deliverable quality** — output is structured and reviewer-readable. | AppSpec card with **Warnings / Assumptions** (if present), entity table, API endpoint table, workflows/integrations sections; validates end-to-end success. |

## Checklist

| File | What to capture |
|------|-----------------|
| `home-dashboard.png` | Full page — empty prompt, both columns, dark theme |
| `generation-flow.png` | Amber status banner + Generate loading state |
| `pipeline.png` | Pipeline card with stages (prefer at least one “running” or all complete) |
| `providers.png` | AI Providers panel + routing summary |
| `appspec-output.png` | AppSpec card with entities/endpoints tables filled |

### Recommended prompt before capture

For `pipeline.png`, `appspec-output.png`, and optionally `generation-flow.png`, run one rich prompt first, e.g.:

```
CRM for real estate with Slack notifications when deals change stage
```

For `appspec-output.png`, consider a second shot using the **unsupported integrations** prompt to show the **Warnings** section:

```
Send Telegram + Discord webhook + SAP integration
```

## Capture tips

- **Browser:** Chrome or Edge, **100% zoom** (not scaled)
- **Theme:** App is dark-only — use default window chrome; no light-mode extension overrides
- **Viewport:** 1440×900 or 1280×800 for consistent README layout
- **State:** Run one demo prompt (see [reviewer-guide.md](../reviewer-guide.md)) before capturing pipeline/AppSpec shots
- **Format:** PNG, under 500 KB each if possible (compress with Squoosh or similar)

## Optional

| File | Demonstrates |
|------|----------------|
| `evaluation.png` | Terminal `npm run evaluate` with **12/12** — regression gate for submission |
| `warnings-example.png` | AppSpec **Warnings** + **Assumptions** for unsupported integrations or conflicting domains |
| `demo.gif` | Full flow in &lt; 30s for portfolio README |

Place files in this folder (`docs/screenshots/`) and update the README screenshot table paths.
