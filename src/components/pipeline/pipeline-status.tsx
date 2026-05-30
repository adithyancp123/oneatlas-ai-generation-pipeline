"use client";

import { PIPELINE_STAGE_ORDER } from "@/config/constants";
import { usePipeline } from "@/hooks";
import { formatProviderExecutionLabel } from "@/lib/ai/provider-execution";
import { cn } from "@/lib/utils";
import type { PipelineStageId } from "@/types/pipeline";
import type { StageLatency } from "@/types/job";
import type { StageProviderExecution } from "@/types/provider-execution";
import { PipelineSkeleton } from "@/components/pipeline/pipeline-skeleton";

type StageState = "pending" | "running" | "complete" | "failed";

const STAGE_LABELS: Record<PipelineStageId, string> = {
  intentExtraction: "Intent extraction",
  schemaGeneration: "Schema generation",
  appSpecGeneration: "AppSpec generation",
  repair: "Repair",
};

const STATUS_LABELS: Record<StageState, string> = {
  pending: "Waiting",
  running: "In progress",
  complete: "Complete",
  failed: "Failed",
};

function isPipelineBootstrapping(
  isGenerating: boolean,
  status: string | null,
  latencies: StageLatency[],
): boolean {
  if (!isGenerating && status !== "queued" && status !== "running") return false;
  return latencies.length === 0;
}

function getStageState(
  stageId: PipelineStageId,
  currentStage: PipelineStageId | null,
  status: string | null,
  latencies: StageLatency[],
  hasErrors: boolean,
): StageState {
  const latency = latencies.find((l) => l.stageId === stageId);
  if (latency) return hasErrors && stageId === "repair" ? "failed" : "complete";
  if (currentStage === stageId && status === "running") return "running";
  if (status === "failed" && currentStage === stageId) return "failed";
  return "pending";
}

const stageClass: Record<StageState, string> = {
  pending: "pipeline-stage-pending",
  running: "pipeline-stage-running",
  complete: "pipeline-stage-complete",
  failed: "pipeline-stage-failed",
};

const dotClass: Record<StageState, string> = {
  pending: "pipeline-dot-pending",
  running: "pipeline-dot-running",
  complete: "pipeline-dot-complete",
  failed: "pipeline-dot-failed",
};

const statusClass: Record<StageState, string> = {
  pending: "pipeline-status-pending",
  running: "pipeline-status-running",
  complete: "pipeline-status-complete",
  failed: "pipeline-status-failed",
};

function findExecution(
  executions: StageProviderExecution[],
  stageId: PipelineStageId,
): StageProviderExecution | undefined {
  return executions.find((entry) => entry.stageId === stageId);
}

export function PipelineStatus() {
  const { status, currentStage, latencies, validationErrors, providerExecutions, isGenerating } =
    usePipeline();

  if (isPipelineBootstrapping(isGenerating, status, latencies)) {
    return <PipelineSkeleton />;
  }

  return (
    <ol className="pipeline-list" aria-label="Pipeline stage progress">
      {PIPELINE_STAGE_ORDER.map((stageId, index) => {
        const state = getStageState(
          stageId,
          currentStage,
          status,
          latencies,
          validationErrors.length > 0,
        );
        const latency = latencies.find((l) => l.stageId === stageId);
        const execution = findExecution(providerExecutions, stageId);
        const isLast = index === PIPELINE_STAGE_ORDER.length - 1;

        return (
          <li key={stageId} className="relative" aria-label={STAGE_LABELS[stageId]}>
            {!isLast ? <span className="pipeline-connector" aria-hidden /> : null}
            <StageCard
              label={STAGE_LABELS[stageId]}
              state={state}
              {...(latency !== undefined ? { latencyMs: latency.durationMs } : {})}
              {...(execution !== undefined ? { execution } : {})}
            />
          </li>
        );
      })}
    </ol>
  );
}

interface StageCardProps {
  label: string;
  state: StageState;
  latencyMs?: number;
  execution?: StageProviderExecution;
}

function StageCard({ label, state, latencyMs, execution }: StageCardProps) {
  return (
    <div className={cn("pipeline-stage", stageClass[state])}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="pipeline-node" aria-hidden>
          <span className={dotClass[state]} />
        </span>
        <div className="min-w-0 flex-1 basis-0">
          <span className="text-sm font-medium text-break text-zinc-100">{label}</span>
          {execution ? (
            <p
              className="mt-0.5 truncate text-mono-data text-zinc-400"
              title={
                execution.fallbackReason
                  ? `${execution.model} — ${execution.fallbackReason}`
                  : execution.model
              }
            >
              {formatProviderExecutionLabel(execution)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="pipeline-meta">
        {latencyMs !== undefined ? (
          <span className="text-mono-data text-zinc-500" aria-label={`${latencyMs} milliseconds`}>
            {latencyMs}ms
          </span>
        ) : null}
        <span className={statusClass[state]}>{STATUS_LABELS[state]}</span>
      </div>
    </div>
  );
}
