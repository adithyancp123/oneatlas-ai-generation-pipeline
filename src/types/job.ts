import type { AppSpec } from "@/types/domain";
import type { PipelineStageId } from "@/types/pipeline";

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
  path: string;
  stageId?: PipelineStageId;
}

export interface RepairLogEntry {
  strategy: string;
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
  createdAt: string;
  updatedAt: string;
}
