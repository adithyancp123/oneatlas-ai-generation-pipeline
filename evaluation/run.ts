import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createJobStore } from "../src/lib/pipeline/orchestration/job-store";
import { PipelineOrchestrator } from "../src/lib/pipeline/orchestration/orchestrator";
import { ALL_EVALUATION_PROMPTS } from "./prompts";
import type { EvaluationResults, EvaluationRunRecord } from "./types";

async function runEvaluation(): Promise<void> {
  const runs: EvaluationRunRecord[] = [];

  for (const item of ALL_EVALUATION_PROMPTS) {
    const store = createJobStore();
    const orchestrator = new PipelineOrchestrator(store);
    const job = store.createJob(item.prompt);
    const start = Date.now();

    try {
      const result = await orchestrator.runJob(job.id);
      const latencyMs = result.latencies.reduce((sum, l) => sum + l.durationMs, 0);
      const lastRepair = result.repairLog?.entries[result.repairLog.entries.length - 1];

      runs.push({
        prompt: item.prompt,
        promptId: item.id,
        success: result.status === "completed" && result.appSpec !== null,
        failedStage:
          result.status === "failed"
            ? result.currentStage ?? result.validationErrors[0]?.stageId ?? "unknown"
            : null,
        repairStrategy: lastRepair?.strategy ?? null,
        retryCount: result.repairLog?.entries.length ?? 0,
        latencyMs: latencyMs || Date.now() - start,
        tokenCostUsd: result.cost?.totalUsd ?? 0,
        integrationsDetected: result.appSpec?.integrations.map((h) => h.integrationId) ?? [],
      });
    } catch {
      runs.push({
        prompt: item.prompt,
        promptId: item.id,
        success: false,
        failedStage: "orchestrator",
        repairStrategy: null,
        retryCount: 0,
        latencyMs: Date.now() - start,
        tokenCostUsd: 0,
        integrationsDetected: [],
      });
    }
  }

  const succeeded = runs.filter((r) => r.success).length;
  const results: EvaluationResults = {
    ranAt: new Date().toISOString(),
    total: runs.length,
    succeeded,
    failed: runs.length - succeeded,
    successRate: runs.length > 0 ? Number(((succeeded / runs.length) * 100).toFixed(1)) : 0,
    runs,
  };

  const outDir = join(process.cwd(), "evaluation");
  mkdirSync(outDir, { recursive: true });

  writeFileSync(join(outDir, "results.json"), JSON.stringify(results, null, 2));
  writeFileSync(join(outDir, "summary.md"), buildSummary(results));

  console.log(`Evaluation complete: ${succeeded}/${runs.length} succeeded`);
}

function buildSummary(results: EvaluationResults): string {
  const stageFailures = new Map<string, number>();
  const strategies = new Map<string, number>();

  for (const run of results.runs) {
    if (run.failedStage) {
      stageFailures.set(run.failedStage, (stageFailures.get(run.failedStage) ?? 0) + 1);
    }
    if (run.repairStrategy) {
      strategies.set(run.repairStrategy, (strategies.get(run.repairStrategy) ?? 0) + 1);
    }
  }

  let weakestStage = "none";
  let maxFails = 0;
  for (const [stage, count] of stageFailures) {
    if (count > maxFails) {
      maxFails = count;
      weakestStage = stage;
    }
  }

  const commonFailure =
    maxFails > 0 ? `${weakestStage} (${maxFails} runs)` : "no dominant failure";

  const avgLatency =
    results.runs.length > 0
      ? Math.round(results.runs.reduce((s, r) => s + r.latencyMs, 0) / results.runs.length)
      : 0;

  const avgCost =
    results.runs.length > 0
      ? Number(
          (results.runs.reduce((s, r) => s + r.tokenCostUsd, 0) / results.runs.length).toFixed(4),
        )
      : 0;

  const topStrategy = [...strategies.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";

  return `# Evaluation Summary

**Ran:** ${results.ranAt}

## Results
- **Success rate:** ${results.successRate}% (${results.succeeded}/${results.total})
- **Average latency:** ${avgLatency}ms
- **Average token cost:** $${avgCost}

## Failure analysis
- **Most common failure:** ${commonFailure}
- **Weakest stage:** ${weakestStage}
- **Top repair strategy used:** ${topStrategy}

## Concrete next fix
Strengthen ${weakestStage === "none" ? "validation rules for edge-case prompts" : `${weakestStage} stage output`} and add targeted repair handlers for the top validation codes observed in failed runs.

## Notes
Evaluation uses in-process orchestrator with mock providers when API keys are absent. ${results.failed} runs failed; review \`evaluation/results.json\` for per-prompt detail.
`;
}

void runEvaluation();
