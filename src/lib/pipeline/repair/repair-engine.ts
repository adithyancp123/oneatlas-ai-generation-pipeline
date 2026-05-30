import { aiGateway } from "@/lib/ai/gateway";
import { providerExecutionFromGateway } from "@/lib/ai/provider-execution";
import { buildMockAppSpec } from "@/lib/pipeline/mocks";
import {
  formatConsistencyRepairLog,
  formatRepairInputError,
  hasJsonStructuralErrors,
  resolveSourceStageId,
} from "@/lib/pipeline/repair/repair-log";
import { repairConsistency } from "@/lib/pipeline/repair/strategies/consistency";
import { repairFields } from "@/lib/pipeline/repair/strategies/field";
import { repairStructuralJson } from "@/lib/pipeline/repair/strategies/structural";
import { appSpecSchema } from "@/lib/pipeline/validators";
import { validateAppSpec } from "@/lib/pipeline/validators/validation-engine";
import type { AppIntent, AppSpec, DataSchema } from "@/types/domain";
import type { RepairLog, RepairLogEntry, RepairOutcome, ValidationError } from "@/types/job";
import type { PipelineStageId } from "@/types/pipeline";
import type { ProviderExecutionMeta } from "@/types/provider-execution";

export interface RepairEngineInput {
  jobId: string;
  prompt: string;
  intent: AppIntent;
  dataSchema: DataSchema;
  draftSpec: Partial<AppSpec> | null;
  validationErrors: ValidationError[];
  existingLog: RepairLog | null;
  /** Repair round 1–3 from orchestrator */
  repairAttempt: number;
  /** Stage that produced the validation errors */
  sourceStageId?: PipelineStageId;
  /** Raw stage text when available — structural repair runs here before parsed spec */
  rawStageOutput?: string;
  useLlm?: boolean;
}

export interface RepairEngineResult {
  appSpec: AppSpec | null;
  repairLog: RepairLog;
  remainingErrors: ValidationError[];
  providerExecution?: ProviderExecutionMeta;
}

function buildBaseSpec(intent: AppIntent, dataSchema: DataSchema, draft: Partial<AppSpec> | null): AppSpec {
  return draft
    ? { ...buildMockAppSpec(intent, dataSchema), ...draft }
    : buildMockAppSpec(intent, dataSchema);
}

function logEntry(
  strategy: string,
  inputError: string,
  attempt: number,
  outcome: RepairOutcome,
  latencyMs: number,
  errorsFixed: number,
  stageId: PipelineStageId,
): RepairLogEntry {
  return {
    strategy,
    inputError,
    attempt,
    outcome,
    latencyMs,
    stageId,
    timestamp: new Date().toISOString(),
    errorsFixed,
  };
}

export async function runRepairEngine(input: RepairEngineInput): Promise<RepairEngineResult> {
  const attempt = input.repairAttempt;
  const entries: RepairLogEntry[] = [...(input.existingLog?.entries ?? [])];
  const stageId = resolveSourceStageId(input.validationErrors, input.sourceStageId ?? "repair");

  let spec = buildBaseSpec(input.intent, input.dataSchema, input.draftSpec);
  let errors = [...input.validationErrors];

  // Structural: prefer raw stage output when JSON/parse errors exist (pre-parse path).
  const structuralStart = Date.now();
  const structuralInput =
    input.rawStageOutput && hasJsonStructuralErrors(errors) ? input.rawStageOutput : spec;
  const structural = repairStructuralJson(structuralInput, errors);
  if (structural.repaired) {
    const parsed = appSpecSchema.safeParse(structural.value);
    if (parsed.success) spec = parsed.data as AppSpec;
  }
  entries.push(
    logEntry(
      "structural",
      formatRepairInputError(errors, "structural"),
      attempt,
      structural.repaired ? "repaired" : "failed",
      Date.now() - structuralStart,
      structural.fixedCodes.length,
      stageId,
    ),
  );

  const fieldStart = Date.now();
  const fieldResult = repairFields(spec, errors);
  if (fieldResult.repaired) {
    spec = fieldResult.spec;
  }
  entries.push(
    logEntry(
      "field",
      formatRepairInputError(errors, "field"),
      attempt,
      fieldResult.repaired ? "repaired" : "failed",
      Date.now() - fieldStart,
      fieldResult.fixedCodes.length,
      stageId,
    ),
  );

  const consistencyStart = Date.now();
  const consistencyResult = repairConsistency(spec, errors, input.dataSchema);
  if (consistencyResult.repaired) {
    spec = consistencyResult.spec;
  }
  entries.push(
    logEntry(
      "consistency",
      formatConsistencyRepairLog(errors, consistencyResult.repairNotes),
      attempt,
      consistencyResult.repaired ? "repaired" : "failed",
      Date.now() - consistencyStart,
      consistencyResult.fixedCodes.length,
      stageId,
    ),
  );

  let validation = validateAppSpec(spec, { canonicalDataSchema: input.dataSchema });
  errors = validation.errors;
  let providerExecution: ProviderExecutionMeta | undefined;

  if (!validation.valid && input.useLlm !== false) {
    const llmStart = Date.now();
    const llmInputError = formatRepairInputError(errors, "llm_correction");
    try {
      const correctionPrompt = [
        "Repair the following AppSpec JSON to fix validation errors.",
        `Errors: ${JSON.stringify(errors.slice(0, 5))}`,
        `Current spec: ${JSON.stringify(spec).slice(0, 4000)}`,
      ].join("\n");

      const gw = await aiGateway.generateForStage(
        { stageId: "repair", prompt: correctionPrompt, metadata: { jobId: input.jobId } },
        appSpecSchema,
      );
      providerExecution = providerExecutionFromGateway(gw);

      if (!gw.mock && typeof gw.data === "object") {
        spec = gw.data as AppSpec;
        validation = validateAppSpec(spec);
        errors = validation.errors;
        entries.push(
          logEntry(
            "llm_correction",
            llmInputError,
            attempt,
            validation.valid ? "repaired" : "escalated",
            Date.now() - llmStart,
            validation.valid ? 1 : 0,
            stageId,
          ),
        );
      } else {
        entries.push(
          logEntry(
            "llm_correction",
            llmInputError,
            attempt,
            "failed",
            Date.now() - llmStart,
            0,
            stageId,
          ),
        );
      }
    } catch {
      entries.push(
        logEntry(
          "llm_correction",
          llmInputError,
          attempt,
          "failed",
          Date.now() - llmStart,
          0,
          stageId,
        ),
      );
    }
  }

  const repairLog: RepairLog = {
    jobId: input.jobId,
    entries,
    success: validation.valid,
  };

  return {
    appSpec: validation.valid ? spec : null,
    repairLog,
    remainingErrors: errors,
    ...(providerExecution !== undefined ? { providerExecution } : {}),
  };
}
