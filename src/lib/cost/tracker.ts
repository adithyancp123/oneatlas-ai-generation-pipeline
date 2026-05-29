import { buildCostBreakdown, createCostLine } from "@/lib/cost/calculator";
import type { TokenUsage } from "@/lib/ai/gateway/types";
import type { CostBreakdown, CostBreakdownLine } from "@/types/job";
import type { PipelineStageId } from "@/types/pipeline";

export class StageCostTracker {
  private readonly lines: CostBreakdownLine[] = [];

  constructor(private readonly jobId: string) {}

  record(
    stageId: PipelineStageId,
    provider: string,
    model: string,
    usage: TokenUsage,
  ): CostBreakdownLine {
    const line = createCostLine(stageId, provider, model, usage);
    this.lines.push(line);
    return line;
  }

  getBreakdown(): CostBreakdown {
    return buildCostBreakdown(this.jobId, [...this.lines]);
  }

  getLines(): readonly CostBreakdownLine[] {
    return this.lines;
  }
}
