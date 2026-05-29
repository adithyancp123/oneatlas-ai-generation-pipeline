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

export function PipelineStatus() {
  const { status, currentStage, latencies, validationErrors } = usePipeline();

  return (
    <ol className="space-y-2">
      {PIPELINE_STAGE_ORDER.map((stageId) => {
        const state = getStageState(
          stageId,
          currentStage,
          status,
          latencies,
          validationErrors.length > 0,
        );
        const latency = latencies.find((l) => l.stageId === stageId);

        return (
          <li key={stageId}>
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
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm",
        state === "running" && "border-amber-500/40 bg-amber-500/5",
        state === "complete" && "border-green-500/30 bg-green-500/5",
        state === "failed" && "border-red-500/30 bg-red-500/5",
        state === "pending" && "border-foreground/10",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            state === "running" && "bg-amber-500",
            state === "complete" && "bg-green-500",
            state === "failed" && "bg-red-500",
            state === "pending" && "bg-foreground/20",
          )}
        />
        <span>{label}</span>
      </div>
      <span className="text-xs text-foreground/50 capitalize">
        {state}
        {latencyMs !== undefined ? ` · ${latencyMs}ms` : ""}
      </span>
    </div>
  );
}
