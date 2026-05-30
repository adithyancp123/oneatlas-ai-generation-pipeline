import {
  appIntentSchema,
  appSpecSchema,
  dataSchemaSchema,
} from "@/lib/pipeline/validators/schemas";
import type { PipelineStageId } from "@/types/pipeline";
import { z } from "zod";

function defaultValueForSchema(schema: z.ZodTypeAny): unknown {
  if (schema instanceof z.ZodDefault) {
    return schema._def.defaultValue();
  }
  if (schema instanceof z.ZodOptional) {
    return undefined;
  }
  if (schema instanceof z.ZodNullable) {
    return defaultValueForSchema(schema._def.innerType);
  }
  if (schema instanceof z.ZodLiteral) {
    return schema.value;
  }
  if (schema instanceof z.ZodEnum) {
    return schema.options[0];
  }
  if (schema instanceof z.ZodString) return "";
  if (schema instanceof z.ZodNumber) return 0;
  if (schema instanceof z.ZodBoolean) return false;
  if (schema instanceof z.ZodArray) return [];
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const obj: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(shape)) {
      const childDefault = defaultValueForSchema(child);
      if (childDefault !== undefined) obj[key] = childDefault;
    }
    return obj;
  }
  if (schema instanceof z.ZodRecord) return {};
  return null;
}

function deepMergeDefaults(base: unknown, patch: unknown): unknown {
  if (patch === null || patch === undefined) return base;
  if (Array.isArray(patch)) return patch;
  if (typeof patch !== "object" || typeof base !== "object" || base === null) {
    return patch;
  }

  const baseRecord = base as Record<string, unknown>;
  const patchRecord = patch as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...baseRecord };

  for (const [key, value] of Object.entries(patchRecord)) {
    if (value === undefined) continue;
    const existing = merged[key];
    if (
      typeof existing === "object" &&
      existing !== null &&
      !Array.isArray(existing) &&
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      merged[key] = deepMergeDefaults(existing, value);
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

export function getStageZodSchema(
  stageId: PipelineStageId,
): z.ZodType<unknown> | null {
  switch (stageId) {
    case "intentExtraction":
      return appIntentSchema;
    case "schemaGeneration":
      return dataSchemaSchema;
    case "appSpecGeneration":
    case "repair":
      return appSpecSchema;
    default:
      return null;
  }
}

/**
 * Merge parsed JSON with Zod-shaped defaults for missing terminal keys (no LLM retry).
 */
export function fillSchemaDefaults(
  value: unknown,
  stageId: PipelineStageId,
): { value: unknown; filledKeys: string[] } {
  const schema = getStageZodSchema(stageId);
  if (!schema) return { value, filledKeys: [] };

  const defaults = defaultValueForSchema(schema);
  const merged = deepMergeDefaults(defaults, value);
  const filledKeys: string[] = [];

  if (typeof defaults === "object" && defaults !== null && typeof value === "object" && value !== null) {
    for (const key of Object.keys(defaults as Record<string, unknown>)) {
      if ((value as Record<string, unknown>)[key] === undefined) {
        filledKeys.push(key);
      }
    }
  }

  return { value: merged, filledKeys };
}
