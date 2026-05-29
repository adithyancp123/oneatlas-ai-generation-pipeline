import { aiGateway } from "@/lib/ai/gateway";
import { buildMockDataSchema } from "@/lib/pipeline/mocks";
import { dataSchemaSchema } from "@/lib/pipeline/validators";
import { validateSchemaOutput } from "@/lib/pipeline/validators/stage-validator";
import type { PipelineStage } from "@/lib/pipeline/stages/types";
import type { AppIntent, DataSchema } from "@/types/domain";
import type { PipelineStageResult } from "@/types/pipeline";

export const schemaGenerationStage: PipelineStage<AppIntent, DataSchema> = {
  id: "schemaGeneration",
  async execute(context, intent): Promise<PipelineStageResult<DataSchema>> {
    const start = Date.now();
    const prompt = `${context.prompt}\n\nIntent JSON:\n${JSON.stringify(intent)}`;

    const gatewayResponse = await aiGateway.generateForStage(
      { stageId: "schemaGeneration", prompt, metadata: { jobId: context.jobId } },
      dataSchemaSchema,
    );

    const output: DataSchema = gatewayResponse.mock
      ? buildMockDataSchema(intent)
      : gatewayResponse.data;

    const validation = validateSchemaOutput(output);

    return {
      stageId: "schemaGeneration",
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
