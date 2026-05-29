import { aiGateway } from "@/lib/ai/gateway";
import { buildMockAppSpec } from "@/lib/pipeline/mocks";
import { appSpecSchema } from "@/lib/pipeline/validators";
import { validateAppSpecOutput } from "@/lib/pipeline/validators/stage-validator";
import type { PipelineStage } from "@/lib/pipeline/stages/types";
import type { AppIntent, AppSpec, DataSchema } from "@/types/domain";
import type { PipelineStageResult } from "@/types/pipeline";

export interface AppSpecGenerationInput {
  intent: AppIntent;
  dataSchema: DataSchema;
}

export const appSpecGenerationStage: PipelineStage<AppSpecGenerationInput, AppSpec> = {
  id: "appSpecGeneration",
  async execute(context, input): Promise<PipelineStageResult<AppSpec>> {
    const start = Date.now();
    const prompt = `${context.prompt}\n\nSchema:\n${JSON.stringify(input.dataSchema)}`;

    const gatewayResponse = await aiGateway.generateForStage(
      { stageId: "appSpecGeneration", prompt, metadata: { jobId: context.jobId } },
      appSpecSchema,
    );

    const output: AppSpec = gatewayResponse.mock
      ? buildMockAppSpec(input.intent, input.dataSchema)
      : gatewayResponse.data;

    const validation = validateAppSpecOutput(output);

    return {
      stageId: "appSpecGeneration",
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
