import { aiGateway } from "@/lib/ai/gateway";
import { buildMockAppSpec } from "@/lib/pipeline/mocks";
import { repairConsistency } from "@/lib/pipeline/repair/strategies/consistency";
import { repairFields } from "@/lib/pipeline/repair/strategies/field";
import { repairStructuralJson } from "@/lib/pipeline/repair/strategies/structural";
import { appSpecSchema } from "@/lib/pipeline/validators";
import { validateAppSpec } from "@/lib/pipeline/validators/validation-engine";
import type { AppIntent, AppSpec, DataSchema } from "@/types/domain";
import type { RepairLog, RepairLogEntry, RepairOutcome, ValidationError } from "@/types/job";

export interface RepairEngineInput {
  jobId: string;
  prompt: string;
  intent: AppIntent;
  dataSchema: DataSchema;
  draftSpec: Partial<AppSpec> | null;
  validationErrors: ValidationError[];
  existingLog: RepairLog | null;
  useLlm?: boolean;
}

export interface RepairEngineResult {
  appSpec: AppSpec | null;
  repairLog: RepairLog;
  remainingErrors: ValidationError[];
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
): RepairLogEntry {
  return {
    strategy,
    inputError,
    attempt,
    outcome,
    latencyMs,
    stageId: "repair",
    timestamp: new Date().toISOString(),
    errorsFixed,
  };
}

export async function runRepairEngine(input: RepairEngineInput): Promise<RepairEngineResult> {
  const start = Date.now();
  const attempt = (input.existingLog?.entries.length ?? 0) + 1;
  const entries: RepairLogEntry[] = [...(input.existingLog?.entries ?? [])];

  let spec = buildBaseSpec(input.intent, input.dataSchema, input.draftSpec);
  let errors = [...input.validationErrors];
  let totalFixed = 0;

  const primaryError = errors[0]?.message ?? "validation_failure";

  const structural = repairStructuralJson(spec, errors);
  if (structural.repaired) {
    const parsed = appSpecSchema.safeParse(structural.value);
    if (parsed.success) spec = parsed.data;
    totalFixed += structural.fixedCodes.length;
    entries.push(
      logEntry("structural", primaryError, attempt, "repaired", Date.now() - start, structural.fixedCodes.length),
    );
  }

  const fieldResult = repairFields(spec, errors);
  if (fieldResult.repaired) {
    spec = fieldResult.spec;
    totalFixed += fieldResult.fixedCodes.length;
    entries.push(
      logEntry("field", primaryError, attempt, "repaired", Date.now() - start, fieldResult.fixedCodes.length),
    );
  }

  const consistencyResult = repairConsistency(spec, errors);
  if (consistencyResult.repaired) {
    spec = consistencyResult.spec;
    totalFixed += consistencyResult.fixedCodes.length;
    entries.push(
      logEntry(
        "consistency",
        primaryError,
        attempt,
        "repaired",
        Date.now() - start,
        consistencyResult.fixedCodes.length,
      ),
    );
  }

  let validation = validateAppSpec(spec);
  errors = validation.errors;

  if (!validation.valid && input.useLlm !== false) {
    const llmStart = Date.now();
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

      if (!gw.mock && typeof gw.data === "object") {
        spec = gw.data;
        validation = validateAppSpec(spec);
        errors = validation.errors;
        entries.push(
          logEntry(
            "llm_correction",
            primaryError,
            attempt,
            validation.valid ? "repaired" : "escalated",
            Date.now() - llmStart,
            validation.valid ? 1 : 0,
          ),
        );
      }
    } catch {
      entries.push(
        logEntry("llm_correction", primaryError, attempt, "failed", Date.now() - llmStart, 0),
      );
    }
  }

  const outcome: RepairOutcome = validation.valid ? "repaired" : errors.length > 0 ? "failed" : "escalated";

  if (entries.length === 0) {
    entries.push(logEntry("none", primaryError, attempt, outcome, Date.now() - start, totalFixed));
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
  };
}
