import { COST_TABLE, DEFAULT_PRICING, getPricingKey } from "@/lib/cost/cost-table";
import type { TokenUsage } from "@/lib/ai/gateway/types";
import type { CostBreakdown, CostBreakdownLine } from "@/types/job";
import type { PipelineStageId } from "@/types/pipeline";

export function estimateCostUsd(
  provider: string,
  model: string,
  usage: TokenUsage,
): number {
  const key = getPricingKey(provider, model);
  const pricing = COST_TABLE[key] ?? DEFAULT_PRICING;
  const inputCost = (usage.promptTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (usage.completionTokens / 1_000_000) * pricing.outputPer1M;
  return Number((inputCost + outputCost).toFixed(6));
}

export function createCostLine(
  stageId: PipelineStageId,
  provider: string,
  model: string,
  usage: TokenUsage,
): CostBreakdownLine {
  return {
    stageId,
    provider,
    model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    estimatedUsd: estimateCostUsd(provider, model, usage),
  };
}

export function buildCostBreakdown(
  jobId: string,
  lines: CostBreakdownLine[],
): CostBreakdown {
  const totalUsd = lines.reduce((sum, line) => sum + line.estimatedUsd, 0);
  return {
    jobId,
    lines,
    totalUsd: Number(totalUsd.toFixed(6)),
  };
}
