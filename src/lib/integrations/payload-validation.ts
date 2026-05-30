import type { PayloadFieldType, PayloadShape } from "@/types/integrations";

export interface PayloadValidationResult {
  valid: boolean;
  errors: string[];
}

function matchesFieldType(value: unknown, expected: PayloadFieldType): boolean {
  switch (expected) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && !Number.isNaN(value);
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    case "array":
      return Array.isArray(value);
    default:
      return false;
  }
}

/** Runtime validation against a typed payload shape */
export function validatePayloadShape(
  payload: unknown,
  shape: PayloadShape,
  options?: { requireAllFields?: boolean },
): PayloadValidationResult {
  const requireAll = options?.requireAllFields ?? false;
  const errors: string[] = [];

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { valid: false, errors: ["Payload must be a non-null object"] };
  }

  const record = payload as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    if (!(key in shape)) {
      errors.push(`Unknown field: ${key}`);
    }
  }

  for (const [key, expectedType] of Object.entries(shape)) {
    if (!(key in record)) {
      if (requireAll) {
        errors.push(`Missing required field: ${key}`);
      }
      continue;
    }
    if (!matchesFieldType(record[key], expectedType)) {
      errors.push(`Field "${key}" must be ${expectedType}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Validates AppSpec hook config keys against an action input schema (string map). */
export function validateIntegrationConfig(
  config: Record<string, string>,
  inputSchema: PayloadShape,
): PayloadValidationResult {
  const errors: string[] = [];
  const keys = Object.keys(config);

  if (keys.length === 0) {
    return { valid: true, errors: [] };
  }

  for (const key of keys) {
    if (!(key in inputSchema)) {
      errors.push(`Unknown config key: ${key}`);
    }
  }

  for (const key of Object.keys(inputSchema)) {
    if (!(key in config)) {
      errors.push(`Missing config key for action input: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
