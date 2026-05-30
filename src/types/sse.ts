import type { AppSpec } from "@/types/domain";
import type { RepairLog, ValidationError } from "@/types/job";
import type { PipelineStageId } from "@/types/pipeline";
import type { ProviderExecutionMeta } from "@/types/provider-execution";

export type PipelineSSEEventType =
  | "stage_start"
  | "stage_complete"
  | "stage_failed"
  | "generation_complete";

export interface PipelineSSEEventBase {
  type: PipelineSSEEventType;
  jobId: string;
  timestamp: string;
}

export interface StageStartEvent extends PipelineSSEEventBase {
  type: "stage_start";
  stage: PipelineStageId;
}

export interface StageCompleteEvent extends PipelineSSEEventBase {
  type: "stage_complete";
  stage: PipelineStageId;
  latencyMs: number;
  partialOutput?: unknown;
  providerExecution?: ProviderExecutionMeta;
}

export interface StageFailedEvent extends PipelineSSEEventBase {
  type: "stage_failed";
  stage: PipelineStageId;
  latencyMs: number;
  errors: ValidationError[];
  repairLog?: RepairLog;
}

export interface GenerationCompleteEvent extends PipelineSSEEventBase {
  type: "generation_complete";
  appSpec: AppSpec | null;
  totalLatencyMs: number;
  costUsd: number;
  repairLog?: RepairLog;
}

export type PipelineSSEEvent =
  | StageStartEvent
  | StageCompleteEvent
  | StageFailedEvent
  | GenerationCompleteEvent;

/** On-the-wire SSE JSON body: `data: { stage, timestamp, data }` */
export interface SSEWirePayload {
  stage: PipelineStageId | null;
  timestamp: string;
  data: Record<string, unknown>;
}
