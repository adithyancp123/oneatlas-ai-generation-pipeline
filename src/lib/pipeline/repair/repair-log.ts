import type { ValidationError } from "@/types/job";
import type { PipelineStageId } from "@/types/pipeline";

const STRUCTURAL_CODES = new Set([
  "invalid_type",
  "invalid_string",
  "invalid_format",
  "STAGE_EXECUTION_ERROR",
]);

const FIELD_CODES = new Set([
  "missing_tenant_id",
  "invalid_table_name",
  "duplicate_table_name",
  "too_small",
  "relation_not_bidirectional",
  "relation_invalid_from",
  "relation_invalid_to",
  "page_without_endpoint",
]);

const CONSISTENCY_CODES = new Set([
  "page_unknown_entity",
  "page_without_endpoint",
  "page_api_bound_mismatch",
  "api_invalid_bound_entity",
  "dataschema_stage_mismatch",
  "integration_not_in_registry",
  "integration_invalid_action",
  "integration_invalid_trigger",
  "integration_invalid_config",
  "workflow_invalid_trigger",
  "workflow_invalid_action",
  "workflow_invalid_trigger_entity",
  "workflow_invalid_step_integration",
  "workflow_invalid_step_action",
  "auth_empty_role",
  "auth_roles_required",
  "auth_permission_unknown_entity",
  "auth_permission_unknown_role",
  "entity_table_mismatch",
]);

export function resolveSourceStageId(
  errors: ValidationError[],
  fallback: PipelineStageId = "repair",
): PipelineStageId {
  const fromError = errors.find((e) => e.stageId)?.stageId;
  return fromError ?? fallback;
}

export function errorsForStrategy(strategy: string, errors: ValidationError[]): ValidationError[] {
  switch (strategy) {
    case "structural":
      return errors.filter(
        (e) =>
          STRUCTURAL_CODES.has(e.code) ||
          e.message.toLowerCase().includes("json") ||
          e.path.toLowerCase().includes("json"),
      );
    case "field":
      return errors.filter((e) => FIELD_CODES.has(e.code));
    case "consistency":
      return errors.filter((e) => CONSISTENCY_CODES.has(e.code));
    default:
      return errors;
  }
}

/** Stringified repair context for graders — code, message, path, stage. */
export function formatRepairInputError(
  errors: ValidationError[],
  strategy: string,
): string {
  const relevant = errorsForStrategy(strategy, errors);
  const slice = (relevant.length > 0 ? relevant : errors).slice(0, 5);

  if (slice.length === 0) {
    return JSON.stringify({ code: "validation_failure", message: "No validation errors supplied" });
  }

  return JSON.stringify(
    slice.map((e) => ({
      code: e.code,
      message: e.message,
      path: e.path || undefined,
      stageId: e.stageId,
    })),
  );
}

export function hasJsonStructuralErrors(errors: ValidationError[]): boolean {
  return errorsForStrategy("structural", errors).length > 0;
}

/** Consistency repair log — includes reviewer notes when placeholder endpoints are created. */
export function formatConsistencyRepairLog(
  errors: ValidationError[],
  repairNotes: string[],
): string {
  const validationErrors = JSON.parse(formatRepairInputError(errors, "consistency")) as {
    code: string;
    message: string;
    path?: string;
    stageId?: string;
  }[];

  return JSON.stringify(
    {
      reason:
        repairNotes.length > 0
          ? "Auto-created placeholder endpoint for orphan page"
          : undefined,
      repairNotes,
      validationErrors,
    },
    null,
    2,
  );
}

export function extractRepairNotices(repairLog: { entries: { strategy: string; inputError: string }[] } | null): string[] {
  const notices: string[] = [];
  for (const entry of repairLog?.entries ?? []) {
    if (entry.strategy !== "consistency") continue;
    try {
      const parsed = JSON.parse(entry.inputError) as {
        repairNotes?: string[];
      };
      if (Array.isArray(parsed.repairNotes)) {
        for (const note of parsed.repairNotes) {
          if (!notices.includes(note)) notices.push(note);
        }
      }
    } catch {
      /* legacy string logs */
    }
  }
  return notices;
}
