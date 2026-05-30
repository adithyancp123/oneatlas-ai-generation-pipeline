import { aiGateway } from "@/lib/ai/gateway";
import {
  buildIntentExtractionPrompt,
  correctIntentAppType,
} from "@/lib/pipeline/intent/app-type-detection";
import { buildMockIntent } from "@/lib/pipeline/mocks";
import { stageProviderExecutionFromGateway } from "@/lib/pipeline/stages/stage-execution";
import { enrichIntentWithPromptInsights } from "@/lib/pipeline/prompt-insights";
import { appIntentSchema } from "@/lib/pipeline/validators";
import { validateIntentOutput } from "@/lib/pipeline/validators/stage-validator";
import type { PipelineStage } from "@/lib/pipeline/stages/types";
import type { AppIntent } from "@/types/domain";
import type { PipelineStageResult } from "@/types/pipeline";

export const intentExtractionStage: PipelineStage<string, AppIntent> = {
  id: "intentExtraction",
  async execute(context, prompt): Promise<PipelineStageResult<AppIntent>> {
    const start = Date.now();

    const extractionPrompt = buildIntentExtractionPrompt(prompt);

    const gatewayResponse = await aiGateway.generateForStage(
      {
        stageId: "intentExtraction",
        prompt: extractionPrompt,
        metadata: { jobId: context.jobId },
      },
      appIntentSchema,
    );

    const output: AppIntent = correctIntentAppType(
      prompt,
      gatewayResponse.mock
        ? buildMockIntent(prompt)
        : enrichIntentWithPromptInsights(prompt, {
            ...(gatewayResponse.data as AppIntent),
            warnings: (gatewayResponse.data as AppIntent).warnings ?? [],
          }),
    );

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
      providerExecution: stageProviderExecutionFromGateway(gatewayResponse),
      ...(validation.errors.length > 0 ? { errors: validation.errors } : {}),
    };
  },
};
