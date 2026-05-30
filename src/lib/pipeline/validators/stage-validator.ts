import {
  validateAppSpec,
  validateDataSchema,
  validateIntent,
  type ValidateAppSpecOptions,
} from "@/lib/pipeline/validators/validation-engine";
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

export function validateAppSpecOutput(
  output: unknown,
  options?: ValidateAppSpecOptions,
): StageValidationResult {
  return validateAppSpec(output, options);
}

export function validateStageOutput(
  stageId: PipelineStageId,
  output: unknown,
  options?: ValidateAppSpecOptions,
): StageValidationResult {
  switch (stageId) {
    case "intentExtraction":
      return validateIntentOutput(output);
    case "schemaGeneration":
      return validateSchemaOutput(output);
    case "appSpecGeneration":
    case "repair":
      return validateAppSpecOutput(output, options);
    default:
      return { valid: true, errors: [] };
  }
}
