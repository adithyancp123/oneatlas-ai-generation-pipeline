import { extractJsonPayload, recoverTruncatedJson } from "@/lib/ai/structured/json-utils";
import { fillSchemaDefaults } from "@/lib/pipeline/repair/schema-defaults";
import type { ValidationError } from "@/types/job";
import type { PipelineStageId } from "@/types/pipeline";

export interface StructuralRepairResult {
  repaired: boolean;
  value: unknown;
  fixedCodes: string[];
}

/**
 * Structural JSON recovery — extract valid JSON, close truncated brackets, fill Zod defaults.
 * Does not call the LLM or re-run the stage.
 */
export function repairStructuralJson(
  raw: unknown,
  errors: ValidationError[],
  stageId: PipelineStageId,
): StructuralRepairResult {
  const jsonErrors = errors.filter(
    (e) =>
      e.code === "invalid_type" ||
      e.message.toLowerCase().includes("json") ||
      e.field.includes("json") ||
      e.path.includes("json"),
  );

  const isStringInput = typeof raw === "string";
  if (!isStringInput && jsonErrors.length === 0) {
    return { repaired: false, value: raw, fixedCodes: [] };
  }

  const text = isStringInput ? raw : JSON.stringify(raw);
  const extracted = extractJsonPayload(text);
  const recovered = recoverTruncatedJson(text);

  const candidates = [extracted, recovered].filter((c): c is string => Boolean(c));
  const fixedCodes: string[] = [];

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      const { value: withDefaults, filledKeys } = fillSchemaDefaults(parsed, stageId);
      if (filledKeys.length > 0) {
        fixedCodes.push("structural_schema_defaults");
      }
      fixedCodes.push("structural_json_recovery");
      return {
        repaired: true,
        value: withDefaults,
        fixedCodes,
      };
    } catch {
      continue;
    }
  }

  if (!isStringInput && typeof raw === "object" && raw !== null) {
    const { value: withDefaults, filledKeys } = fillSchemaDefaults(raw, stageId);
    if (filledKeys.length > 0) {
      return {
        repaired: true,
        value: withDefaults,
        fixedCodes: ["structural_schema_defaults"],
      };
    }
  }

  return { repaired: false, value: raw, fixedCodes: [] };
}
