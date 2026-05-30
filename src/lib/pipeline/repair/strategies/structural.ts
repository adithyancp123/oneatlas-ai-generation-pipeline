import { extractJsonPayload, recoverTruncatedJson } from "@/lib/ai/structured/json-utils";
import type { ValidationError } from "@/types/job";

export interface StructuralRepairResult {
  repaired: boolean;
  value: unknown;
  fixedCodes: string[];
}

/**
 * Structural JSON recovery for malformed/truncated LLM output.
 * When `raw` is a parsed AppSpec object, recovery rarely applies — the orchestrator
 * passes `rawStageOutput` (pre-parse string) when JSON errors are detected.
 */
export function repairStructuralJson(
  raw: unknown,
  errors: ValidationError[],
): StructuralRepairResult {
  const jsonErrors = errors.filter(
    (e) =>
      e.code === "invalid_type" ||
      e.message.toLowerCase().includes("json") ||
      e.path.includes("json"),
  );

  if (typeof raw !== "string" && jsonErrors.length === 0) {
    return { repaired: false, value: raw, fixedCodes: [] };
  }

  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  const extracted = extractJsonPayload(text);
  const recovered = recoverTruncatedJson(text);

  const candidates = [extracted, recovered].filter((c): c is string => Boolean(c));

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      return {
        repaired: true,
        value: parsed,
        fixedCodes: ["structural_json_recovery"],
      };
    } catch {
      continue;
    }
  }

  return { repaired: false, value: raw, fixedCodes: [] };
}
