import type { PipelineStageId, PipelineStageResult } from "@/types/pipeline";

export interface StageContext {
  jobId: string;
  prompt: string;
  previousOutputs: Partial<Record<PipelineStageId, unknown>>;
}

export interface PipelineStage<TInput = unknown, TOutput = unknown> {
  readonly id: PipelineStageId;
  execute(context: StageContext, input: TInput): Promise<PipelineStageResult<TOutput>>;
}
