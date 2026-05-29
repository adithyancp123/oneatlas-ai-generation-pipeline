import { aiGateway } from "@/lib/ai/gateway";
import { buildMockIntent } from "@/lib/pipeline/mocks";
import { appIntentSchema } from "@/lib/pipeline/validators";
import { validateIntentOutput } from "@/lib/pipeline/validators/stage-validator";
import type { PipelineStage } from "@/lib/pipeline/stages/types";
import type { AppIntent } from "@/types/domain";
import type { PipelineStageResult } from "@/types/pipeline";

export const intentExtractionStage: PipelineStage<string, AppIntent> = {
  id: "intentExtraction",
  async execute(context, prompt): Promise<PipelineStageResult<AppIntent>> {
    const start = Date.now();

    const gatewayResponse = await aiGateway.generateForStage(
      { stageId: "intentExtraction", prompt, metadata: { jobId: context.jobId } },
      appIntentSchema,
    );

    const output: AppIntent = gatewayResponse.mock
      ? buildMockIntent(prompt)
      : gatewayResponse.data;

    const validation = validateIntentOutput(output);

    return {
      stageId: "intentExtraction",
      success: validation.valid,
      output,
      durationMs: Date.now() - start,
      usage: {
        provider: gatewayResponse.provider,
        model: gatewayResponse.model,
        promptTokens: gatewayResponse.usage.promptTokens,
        completionTokens: gatewayResponse.usage.completionTokens,
        estimatedUsd: gatewayResponse.estimatedCostUsd,
      },
      ...(validation.errors.length > 0 ? { errors: validation.errors } : {}),
    };
  },
};
