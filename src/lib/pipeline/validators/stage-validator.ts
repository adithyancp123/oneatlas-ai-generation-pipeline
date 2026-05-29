import { validateAppSpec, validateDataSchema, validateIntent } from "@/lib/pipeline/validators/validation-engine";
import type { ValidationError } from "@/types/job";
import type { PipelineStageId } from "@/types/pipeline";

export interface StageValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateIntentOutput(output: unknown): StageValidationResult {
  return validateIntent(output);
}

export function validateSchemaOutput(output: unknown): StageValidationResult {
  return validateDataSchema(output);
}

export function validateAppSpecOutput(output: unknown): StageValidationResult {
  return validateAppSpec(output);
}

export function validateStageOutput(
  stageId: PipelineStageId,
  output: unknown,
): StageValidationResult {
  switch (stageId) {
    case "intentExtraction":
      return validateIntentOutput(output);
    case "schemaGeneration":
      return validateSchemaOutput(output);
    case "appSpecGeneration":
    case "repair":
      return validateAppSpecOutput(output);
    default:
      return { valid: true, errors: [] };
  }
}
