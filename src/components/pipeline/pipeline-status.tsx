"use client";

import { PIPELINE_STAGE_ORDER } from "@/config/constants";
import { usePipeline } from "@/hooks";
import { cn } from "@/lib/utils";
import type { PipelineStageId } from "@/types/pipeline";
import type { StageLatency } from "@/types/job";

const STAGE_LABELS: Record<PipelineStageId, string> = {
  intentExtraction: "Intent extraction",
  schemaGeneration: "Schema generation",
  appSpecGeneration: "AppSpec generation",
  repair: "Repair",
};

type StageState = "pending" | "running" | "complete" | "failed";

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

export function PipelineStatus() {
  const { status, currentStage, latencies, validationErrors } = usePipeline();

  return (
    <ol className="pipeline-list">
      {PIPELINE_STAGE_ORDER.map((stageId, index) => {
        const state = getStageState(
          stageId,
          currentStage,
          status,
          latencies,
          validationErrors.length > 0,
        );
        const latency = latencies.find((l) => l.stageId === stageId);
        const isLast = index === PIPELINE_STAGE_ORDER.length - 1;

        return (
          <li key={stageId} className="relative">
            {!isLast ? <span className="pipeline-connector" aria-hidden /> : null}
            <StageCard
              label={STAGE_LABELS[stageId]}
              state={state}
              {...(latency !== undefined ? { latencyMs: latency.durationMs } : {})}
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
}

function StageCard({ label, state, latencyMs }: StageCardProps) {
  return (
    <div className={cn("pipeline-stage", stageClass[state])}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="pipeline-node">
          <span className={dotClass[state]} />
        </span>
        <span className="truncate text-sm font-medium text-zinc-100">{label}</span>
      </div>
      <div className="pipeline-meta">
        {latencyMs !== undefined ? (
          <span className="font-mono text-zinc-500">{latencyMs}ms</span>
        ) : null}
        <span className={statusClass[state]}>{state}</span>
      </div>
    </div>
  );
}
