import { buildMockAppSpec } from "@/lib/pipeline/mocks";
import {
  errorsForStrategy,
  formatRepairErrorInput,
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

export type RepairStrategyName = "structural" | "field" | "consistency";

export interface RepairEngineInput {
  jobId: string;
  prompt: string;
  intent: AppIntent;
  dataSchema: DataSchema;
  draftSpec: Partial<AppSpec> | null;
  validationErrors: ValidationError[];
  existingLog: RepairLog | null;
  repairAttempt: number;
  sourceStageId?: PipelineStageId;
  rawStageOutput?: string;
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
  strategy: RepairStrategyName,
  validationErrors: ValidationError[],
  attempt: number,
  outcome: RepairOutcome,
  latencyMs: number,
  errorsFixed: number,
  stageId: PipelineStageId,
): RepairLogEntry {
  const errorInput = formatRepairErrorInput(validationErrors, strategy);
  return {
    strategy,
    errorInput,
    inputError: errorInput,
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

  const structuralStart = Date.now();
  const structuralInput =
    input.rawStageOutput && hasJsonStructuralErrors(errors) ? input.rawStageOutput : spec;
  const structural = repairStructuralJson(structuralInput, errors, stageId);
  if (structural.repaired) {
    const parsed = appSpecSchema.safeParse(structural.value);
    if (parsed.success) spec = parsed.data as AppSpec;
  }
  const structuralErrors = errorsForStrategy("structural", errors);
  entries.push(
    logEntry(
      "structural",
      structuralErrors.length > 0 ? structuralErrors : errors,
      attempt,
      structural.repaired ? "repaired" : "failed",
      Date.now() - structuralStart,
      structural.fixedCodes.length,
      stageId,
    ),
  );

  const fieldStart = Date.now();
  const fieldResult = await repairFields(spec, errors, {
    jobId: input.jobId,
    prompt: input.prompt,
    stageId,
    intent: input.intent,
    dataSchema: input.dataSchema,
  });
  if (fieldResult.repaired) {
    spec = fieldResult.spec;
  }
  const fieldErrors = errorsForStrategy("field", errors);
  entries.push(
    logEntry(
      "field",
      fieldErrors.length > 0 ? fieldErrors : errors,
      attempt,
      fieldResult.repaired ? (fieldResult.escalated ? "escalated" : "repaired") : "failed",
      Date.now() - fieldStart,
      fieldResult.fixedCodes.length,
      stageId,
    ),
  );

  const consistencyStart = Date.now();
  const consistencyResult = await repairConsistency(
    spec,
    errors,
    input.dataSchema,
    input.jobId,
  );
  if (consistencyResult.repaired) {
    spec = consistencyResult.spec;
  }
  const consistencyErrors = errorsForStrategy("consistency", errors);
  entries.push(
    logEntry(
      "consistency",
      consistencyErrors.length > 0 ? consistencyErrors : errors,
      attempt,
      consistencyResult.repaired
        ? consistencyResult.needsLlm
          ? "escalated"
          : "repaired"
        : "failed",
      Date.now() - consistencyStart,
      consistencyResult.fixedCodes.length,
      stageId,
    ),
  );

  const validation = validateAppSpec(spec, { canonicalDataSchema: input.dataSchema });
  errors = validation.errors;

  const repairLog: RepairLog = {
    jobId: input.jobId,
    entries,
    success: validation.valid,
  };

  return {
    appSpec: validation.valid ? spec : null,
    repairLog,
    remainingErrors: errors,
  };
}
