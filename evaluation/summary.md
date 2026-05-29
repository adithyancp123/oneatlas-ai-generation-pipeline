# Evaluation Summary

**Ran:** 2026-05-29T16:33:20.054Z

## Results
- **Success rate:** 100% (12/12)
- **Average latency:** 3112ms
- **Average token cost:** $0.0128

## Failure analysis
- **Most common failure:** no dominant failure
- **Weakest stage:** none
- **Top repair strategy used:** none

## Concrete next fix
Strengthen validation rules for edge-case prompts and add targeted repair handlers for the top validation codes observed in failed runs.

## Notes
Evaluation uses in-process orchestrator with mock providers when API keys are absent. 0 runs failed; review `evaluation/results.json` for per-prompt detail.
