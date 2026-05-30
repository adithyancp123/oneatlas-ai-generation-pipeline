import type { AppSpec } from "@/types/domain";
import type { ValidationError } from "@/types/job";
import type { ProviderExecutionMeta } from "@/types/provider-execution";

export type PipelineStageId =
  | "intentExtraction"
  | "schemaGeneration"
  | "appSpecGeneration"
  | "repair";

export type PipelineJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface PipelineStageUsage {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedUsd: number;
}

export interface PipelineStageResult<T = unknown> {
  stageId: PipelineStageId;
  success: boolean;
  output: T;
  durationMs: number;
  errors?: ValidationError[];
  usage?: PipelineStageUsage;
  /** Optional reviewer-facing provider execution metadata for this stage. */
  providerExecution?: ProviderExecutionMeta;
}

export interface PipelineError {
  code: string;
  message: string;
  stageId?: PipelineStageId;
  details?: Record<string, unknown>;
}

export interface PipelineJob {
  id: string;
  status: PipelineJobStatus;
  prompt: string;
  currentStage: PipelineStageId | null;
  stages: PipelineStageResult[];
  appSpec: AppSpec | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateRequest {
  prompt: string;
  provider?: string;
  model?: string;
}

export interface GenerateResponse {
  jobId: string;
  status: PipelineJobStatus;
}
