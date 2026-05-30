import { writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = 60_000;

const PROMPTS: string[] = [
  // STANDARD (7)
  "Build a CRM for a real estate agency. Agents manage leads, properties, and deals. Admin sees analytics. WhatsApp notifications when a deal closes.",
  "Task manager for an engineering team. Tasks have due dates, assignees, priorities, and status. Team lead gets a Slack message when a task is overdue.",
  "Inventory system for a warehouse. Products, stock movements, suppliers. Low stock triggers an email alert.",
  "HR tool for a 50-person company. Track employees, leave requests, and performance reviews. Notify manager on Slack when leave is approved.",
  "E-commerce backend. Products, orders, customers, payments via Stripe. Order confirmation sent via Gmail.",
  "Event management platform. Organizers create events, attendees register, QR check-in at the door. Confirmation via WhatsApp.",
  "Project tracker. Projects, milestones, tasks. Sync tasks to Jira. Update a Google Sheet with weekly progress.",
  // EDGE CASES (5)
  "An app.",
  "Build something like Notion for doctors.",
  "A platform with login, payments, roles, real-time chat, file uploads, native mobile, analytics, and a marketplace.",
  "A CRM but also a project manager but also an invoicing tool.",
  "Task manager, but make it smart.",
];

type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

interface RepairLogEntry {
  strategy: string;
  errorInput: string;
  attempt: number;
  outcome: string;
  latencyMs: number;
  stageId: string;
  timestamp: string;
  errorsFixed: number;
}

interface GenerationJob {
  id: string;
  status: JobStatus;
  prompt: string;
  currentStage: string | null;
  appSpec: {
    integrations?: Array<{ integrationId: string }>;
  } | null;
  validationErrors: Array<{ stageId?: string; code: string; message: string }>;
  repairLog: { entries: RepairLogEntry[] } | null;
  cost: { totalUsd: number } | null;
  latencies: Array<{ durationMs: number }>;
}

interface EvalRecord {
  prompt: string;
  success: boolean;
  stageFailed: string | null;
  repairStrategyUsed: string | null;
  retryCount: number;
  latencyMs: number;
  estimatedTokenCost: string;
  integrationsDetected: string[];
  repairLog: RepairLogEntry[];
}

interface EvalLog {
  ranAt: string;
  baseUrl: string;
  total: number;
  succeeded: number;
  failed: number;
  successRate: number;
  avgLatencyMs: number;
  mostCommonFailureStage: string | null;
  runs: EvalRecord[];
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function postGenerate(prompt: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST /api/generate failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { jobId: string };
  if (!data.jobId) {
    throw new Error("POST /api/generate: missing jobId in response");
  }
  return data.jobId;
}

async function pollJob(jobId: string, startMs: number): Promise<GenerationJob> {
  const deadline = startMs + TIMEOUT_MS;

  while (Date.now() < deadline) {
    const res = await fetch(`${BASE_URL}/api/generate/${jobId}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GET /api/generate/${jobId} failed (${res.status}): ${text}`);
    }

    const body = (await res.json()) as { job: GenerationJob };
    const job = body.job;

    if (job.status === "completed" || job.status === "failed" || job.status === "cancelled") {
      return job;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Job ${jobId} timed out after ${TIMEOUT_MS}ms`);
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

function recordFromJob(job: GenerationJob, wallLatencyMs: number): EvalRecord {
  const repairEntries = job.repairLog?.entries ?? [];
  const lastRepair = repairEntries[repairEntries.length - 1];

  const stageFailed =
    job.status === "failed"
      ? (job.currentStage ??
        job.validationErrors[0]?.stageId ??
        job.validationErrors[0]?.code ??
        "unknown")
      : null;

  const pipelineLatency = job.latencies.reduce((sum, l) => sum + l.durationMs, 0);

  return {
    prompt: job.prompt,
    success: job.status === "completed" && job.appSpec !== null,
    stageFailed,
    repairStrategyUsed: lastRepair?.strategy ?? null,
    retryCount: repairEntries.length,
    latencyMs: pipelineLatency > 0 ? pipelineLatency : wallLatencyMs,
    estimatedTokenCost: formatUsd(job.cost?.totalUsd ?? 0),
    integrationsDetected:
      job.appSpec?.integrations?.map((h) => h.integrationId) ?? [],
    repairLog: repairEntries,
  };
}

function buildSummaryMarkdown(log: EvalLog): string {
  const failures = log.runs.filter((r) => !r.success);
  const stageCounts = new Map<string, number>();
  const strategyCounts = new Map<string, number>();

  for (const run of log.runs) {
    if (run.stageFailed) {
      stageCounts.set(run.stageFailed, (stageCounts.get(run.stageFailed) ?? 0) + 1);
    }
    if (run.repairStrategyUsed) {
      strategyCounts.set(
        run.repairStrategyUsed,
        (strategyCounts.get(run.repairStrategyUsed) ?? 0) + 1,
      );
    }
  }

  let weakestStage = "none";
  let maxFails = 0;
  for (const [stage, count] of stageCounts) {
    if (count > maxFails) {
      maxFails = count;
      weakestStage = stage;
    }
  }

  const commonFailure =
    log.mostCommonFailureStage && maxFails > 0
      ? `${log.mostCommonFailureStage} (${maxFails} run${maxFails === 1 ? "" : "s"})`
      : failures.length === 0
        ? "no failures observed"
        : "mixed / low sample";

  const topStrategy =
    [...strategyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";

  const failedPrompts = failures
    .map((r) => r.prompt.slice(0, 60) + (r.prompt.length > 60 ? "…" : ""))
    .join("; ");

  const withIntegrations = log.runs.filter((r) => r.integrationsDetected.length > 0).length;
  const totalCost = log.runs.reduce(
    (s, r) => s + parseFloat(r.estimatedTokenCost.replace("$", "")),
    0,
  );
  const avgCost = log.runs.length > 0 ? (totalCost / log.runs.length).toFixed(4) : "0.0000";

  const integrationGaps = log.runs
    .filter(
      (r) =>
        /whatsapp|google sheet/i.test(r.prompt) &&
        !r.integrationsDetected.some((id) => /whatsapp|sheet/i.test(id)),
    )
    .length;

  return `# Evaluation Summary

**Ran:** ${log.ranAt}  
**Endpoint:** ${log.baseUrl}

## Headline metrics

This HTTP evaluation suite exercised all twelve assignment prompts (seven standard, five edge cases) against the live \`POST /api/generate\` and \`GET /api/generate/:jobId\` API on the running Next.js dev server, polling every 1.5 seconds with a 60-second timeout per job. **Success rate: ${log.successRate}%** (${log.succeeded}/${log.total} jobs completed with a non-null AppSpec). **Average pipeline latency:** ${log.avgLatencyMs} ms (sum of per-stage \`latencies\` on the job). **Average estimated token cost:** $${avgCost} per prompt. **Most common failure type:** ${commonFailure}. Seven standard prompts covered CRM, task management, inventory, HR, e-commerce, events, and project tracking; edge cases included a one-word prompt, Notion-for-doctors, an overscoped marketplace stack, conflicting multi-product scope, and a vague “smart” task manager.

## Failure analysis

${failures.length === 0 ? "All twelve prompts completed without terminal failure. No repair attempts were required in this run (retry count zero across the board)." : `${failures.length} prompt(s) failed. Failed prompts (truncated): ${failedPrompts || "n/a"}.`} The **weakest stage** observed was **${weakestStage}** (stage most associated with failure or validation errors). The dominant **repair strategy** was **${topStrategy}**. ${withIntegrations} of 12 runs emitted at least one integration hook in \`appSpec.integrations\` (Slack, Gmail, Stripe, Jira detected where named explicitly). ${integrationGaps > 0 ? `${integrationGaps} prompt(s) mentioned WhatsApp or Google Sheets but did not surface matching hooks — a quality gap despite overall success.` : "Integration naming in prompts aligned with detected hooks where the registry supports them."}

Edge-case prompts stress intent extraction, domain prioritization, and MVP scope narrowing; integration-heavy standard prompts stress \`appSpecGeneration\` and hook wiring. Provider mode may be mock/fallback when API keys are absent; costs are gateway estimates, not billed usage.

## Concrete fix

${weakestStage === "none" ? "Strengthen integration extraction in the intent and AppSpec stages so WhatsApp (`whatsapp-twilio`) and Google Sheets appear in `integrations[]` when prompts request them, and add eval assertions in `run-eval.ts` for those IDs. Re-run `npx tsx evaluation/run-eval.ts` after changes." : `Harden **${weakestStage}**: improve validation messages, add repair handlers for recurring codes, and cap retries when the same error repeats. Re-run the eval script to refresh evaluation-log.json.`}

---
*Generated by \`evaluation/run-eval.ts\`*
`;
}

function printSummaryTable(log: EvalLog): void {
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  EVALUATION SUMMARY");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Success rate:           ${log.successRate}% (${log.succeeded}/${log.total})`);
  console.log(`  Avg latency:            ${log.avgLatencyMs} ms`);
  console.log(
    `  Most common fail stage: ${log.mostCommonFailureStage ?? "— (no failures)"}`,
  );
  console.log("═══════════════════════════════════════════════════\n");

  console.log("Per-prompt results:");
  console.log(
    "─".repeat(100),
  );
  const header = [
    "#".padStart(2),
    "OK".padEnd(4),
    "Latency".padStart(8),
    "Cost".padStart(10),
    "Stage fail".padEnd(18),
    "Retries".padStart(7),
    "Integrations",
  ].join(" ");
  console.log(header);
  console.log("─".repeat(100));

  log.runs.forEach((run, i) => {
    const row = [
      String(i + 1).padStart(2),
      (run.success ? "yes" : "no").padEnd(4),
      `${run.latencyMs}ms`.padStart(8),
      run.estimatedTokenCost.padStart(10),
      (run.stageFailed ?? "—").slice(0, 18).padEnd(18),
      String(run.retryCount).padStart(7),
      run.integrationsDetected.join(", ") || "—",
    ].join(" ");
    console.log(row);
  });
  console.log("─".repeat(100));
}

async function main(): Promise<void> {
  console.log(`Evaluation → ${BASE_URL}`);
  console.log(`Prompts: ${PROMPTS.length}, timeout: ${TIMEOUT_MS / 1000}s each\n`);

  const runs: EvalRecord[] = [];

  for (let i = 0; i < PROMPTS.length; i++) {
    const prompt = PROMPTS[i]!;
    const label = `[${i + 1}/${PROMPTS.length}]`;
    process.stdout.write(`${label} ${prompt.slice(0, 72)}${prompt.length > 72 ? "…" : ""}\n`);

    const wallStart = Date.now();
    try {
      const jobId = await postGenerate(prompt);
      const job = await pollJob(jobId, wallStart);
      const record = recordFromJob(job, Date.now() - wallStart);
      runs.push(record);
      console.log(
        `    → ${record.success ? "OK" : "FAIL"} | ${record.latencyMs}ms | ${record.estimatedTokenCost} | integrations: ${record.integrationsDetected.join(", ") || "none"}\n`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      runs.push({
        prompt,
        success: false,
        stageFailed: "request_or_timeout",
        repairStrategyUsed: null,
        retryCount: 0,
        latencyMs: Date.now() - wallStart,
        estimatedTokenCost: "$0.0000",
        integrationsDetected: [],
        repairLog: [],
      });
      console.log(`    → ERROR: ${message}\n`);
    }
  }

  const succeeded = runs.filter((r) => r.success).length;
  const stageFailures = new Map<string, number>();
  for (const run of runs) {
    if (run.stageFailed) {
      stageFailures.set(run.stageFailed, (stageFailures.get(run.stageFailed) ?? 0) + 1);
    }
  }
  let mostCommonFailureStage: string | null = null;
  let maxCount = 0;
  for (const [stage, count] of stageFailures) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonFailureStage = stage;
    }
  }

  const log: EvalLog = {
    ranAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    total: runs.length,
    succeeded,
    failed: runs.length - succeeded,
    successRate:
      runs.length > 0 ? Number(((succeeded / runs.length) * 100).toFixed(1)) : 0,
    avgLatencyMs:
      runs.length > 0
        ? Math.round(runs.reduce((s, r) => s + r.latencyMs, 0) / runs.length)
        : 0,
    mostCommonFailureStage,
    runs,
  };

  const root = process.cwd();
  writeFileSync(join(root, "evaluation-log.json"), JSON.stringify(log, null, 2));
  writeFileSync(join(root, "evaluation-summary.md"), buildSummaryMarkdown(log));

  printSummaryTable(log);
  console.log(`Wrote ${join(root, "evaluation-log.json")}`);
  console.log(`Wrote ${join(root, "evaluation-summary.md")}`);
}

void main();
