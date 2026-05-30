import type { AppSpec } from "@/types/domain";
import type { PipelineStageId } from "@/types/pipeline";
import type { StageProviderExecution } from "@/types/provider-execution";

export type GenerationJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type RepairOutcome = "repaired" | "escalated" | "failed";

export interface ValidationError {
  code: string;
  message: string;
  /** Dot-path to the invalid value (e.g. pages.page-contact) */
  field: string;
  /** @deprecated Use `field` — kept for backward compatibility */
  path: string;
  stageId?: PipelineStageId;
}

export type RepairStrategyName = "structural" | "field" | "consistency";

export interface RepairLogEntry {
  strategy: RepairStrategyName | string;
  /** JSON string of validation error(s) that triggered this attempt */
  errorInput: string;
  /** @deprecated Use errorInput */
  inputError: string;
  attempt: number;
  outcome: RepairOutcome;
  latencyMs: number;
  stageId: PipelineStageId;
  timestamp: string;
  errorsFixed: number;
}

export interface RepairLog {
  jobId: string;
  entries: RepairLogEntry[];
  success: boolean;
}

export interface StageLatency {
  stageId: PipelineStageId;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface CostBreakdownLine {
  stageId: PipelineStageId;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedUsd: number;
}

export interface CostBreakdown {
  jobId: string;
  lines: CostBreakdownLine[];
  totalUsd: number;
}

export interface GenerationJob {
  id: string;
  status: GenerationJobStatus;
  prompt: string;
  currentStage: PipelineStageId | null;
  appSpec: AppSpec | null;
  validationErrors: ValidationError[];
  repairLog: RepairLog | null;
  cost: CostBreakdown | null;
  latencies: StageLatency[];
  /** Per-stage provider execution mode (live / mock / fallback) for reviewer transparency. */
  providerExecutions?: StageProviderExecution[];
  createdAt: string;
  updatedAt: string;
}
