import type { PipelineStageId } from "@/types/pipeline";

/** How the provider was invoked for a stage (reviewer-facing). */
export type ProviderExecutionMode = "live" | "mock" | "fallback";

export interface ProviderExecutionMeta {
  provider: string;
  model: string;
  mode: ProviderExecutionMode;
  fallbackReason?: string;
  latencyMs?: number;
}

export interface StageProviderExecution extends ProviderExecutionMeta {
  stageId: PipelineStageId;
}
