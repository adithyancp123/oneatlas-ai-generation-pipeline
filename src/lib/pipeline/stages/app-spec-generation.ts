import { aiGateway } from "@/lib/ai/gateway";
import {
  buildAppSpecGenerationPrompt,
  ensureWorkflowStubs,
} from "@/lib/pipeline/appspec/workflow-fallback";
import { buildMockAppSpec } from "@/lib/pipeline/mocks";
import { stageProviderExecutionFromGateway } from "@/lib/pipeline/stages/stage-execution";
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
    const prompt = buildAppSpecGenerationPrompt(
      context.prompt,
      input.intent,
      input.dataSchema,
    );

    const gatewayResponse = await aiGateway.generateForStage(
      { stageId: "appSpecGeneration", prompt, metadata: { jobId: context.jobId } },
      appSpecSchema,
    );

    let output: AppSpec = gatewayResponse.mock
      ? buildMockAppSpec(input.intent, input.dataSchema, context.prompt)
      : ({
          ...(gatewayResponse.data as AppSpec),
          intent: {
            ...(gatewayResponse.data as AppSpec).intent,
            warnings: (gatewayResponse.data as AppSpec).intent.warnings ?? [],
          },
        } as AppSpec);

    output = {
      ...output,
      intent: {
        ...input.intent,
        ...output.intent,
        integrationsRequested: input.intent.integrationsRequested,
      },
    };

    output = ensureWorkflowStubs(output, context.prompt);

    const validation = validateAppSpecOutput(output, {
      canonicalDataSchema: input.dataSchema,
    });

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
      providerExecution: stageProviderExecutionFromGateway(gatewayResponse),
      ...(validation.errors.length > 0 ? { errors: validation.errors } : {}),
    };
  },
};
