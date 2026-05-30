import { runRepairEngine } from "@/lib/pipeline/repair";
import type { AppSpecGenerationInput } from "@/lib/pipeline/stages/app-spec-generation";
import type { PipelineStage } from "@/lib/pipeline/stages/types";
import type { AppSpec } from "@/types/domain";
import type { ValidationError } from "@/types/job";
import type { PipelineStageResult } from "@/types/pipeline";

export interface RepairStageInput extends AppSpecGenerationInput {
  jobId: string;
  prompt: string;
  draftSpec: Partial<AppSpec> | null;
  validationErrors: ValidationError[];
}

export const repairStage: PipelineStage<RepairStageInput, AppSpec> = {
  id: "repair",
  async execute(context, input): Promise<PipelineStageResult<AppSpec>> {
    const start = Date.now();

    const result = await runRepairEngine({
      jobId: input.jobId,
      prompt: input.prompt,
      intent: input.intent,
      dataSchema: input.dataSchema,
      draftSpec: input.draftSpec,
      validationErrors: input.validationErrors,
      existingLog: null,
      repairAttempt: 1,
      sourceStageId: "appSpecGeneration",
    });

    void context;

    if (!result.appSpec) {
      return {
        stageId: "repair",
        success: false,
        output: buildPartialSpec(input),
        durationMs: Date.now() - start,
        errors: result.remainingErrors,
      };
    }

    return {
      stageId: "repair",
      success: true,
      output: result.appSpec,
      durationMs: Date.now() - start,
    };
  },
};

function buildPartialSpec(input: RepairStageInput): AppSpec {
  return {
    version: "1.0",
    name: input.intent.appName,
    description: input.intent.summary,
    intent: input.intent,
    dataSchema: input.dataSchema,
    pages: [],
    apiEndpoints: [],
    auth: { strategy: "jwt", roles: ["user"], publicRoutes: [] },
    integrations: [],
    workflows: [],
  };
}
