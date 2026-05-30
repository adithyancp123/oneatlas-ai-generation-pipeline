import {
  APP_TYPE_VALUES,
  detectAppTypeFromPrompt,
  isValidAppType,
  type AppType,
} from "@/lib/pipeline/intent/app-type-detection";
import type { ExtractedEntity } from "@/types/domain";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function pickStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) {
      items.push(item.trim());
      continue;
    }
    if (isRecord(item)) {
      const name = pickString(item, ["name", "title", "label"]);
      if (name) items.push(name);
    }
  }
  return items.length > 0 ? items : undefined;
}

function coerceAppType(value: unknown, prompt: string): AppType {
  if (isValidAppType(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
    if (APP_TYPE_VALUES.includes(normalized as AppType)) {
      return normalized as AppType;
    }
  }
  return detectAppTypeFromPrompt(prompt);
}

function normalizeEntities(value: unknown): ExtractedEntity[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [{ name: "User", description: "Primary application user" }];
  }

  const entities: ExtractedEntity[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim().length > 0) {
      entities.push({ name: item.trim(), description: "" });
      continue;
    }
    if (isRecord(item)) {
      const name = pickString(item, ["name", "entity", "table", "title"]);
      if (name) {
        entities.push({
          name,
          description: pickString(item, ["description", "summary"]) ?? "",
        });
      }
    }
  }

  return entities.length > 0
    ? entities
    : [{ name: "User", description: "Primary application user" }];
}

/**
 * Coerce heterogeneous LLM JSON into a shape Zod can validate (no prompt context).
 */
export function normalizeAppIntentInput(
  input: unknown,
  options?: { prompt?: string },
): Record<string, unknown> {
  const prompt = options?.prompt?.trim() ?? "";
  const raw = isRecord(input) ? input : {};

  const appType = coerceAppType(
    raw.appType ?? raw.domain ?? raw.applicationType ?? raw.type,
    prompt,
  );

  const appName =
    pickString(raw, ["appName", "name", "title", "applicationName"]) ??
    (prompt.length > 0 ? prompt.slice(0, 80) : "Generated Application");

  const summary =
    pickString(raw, ["summary", "description", "overview"]) ??
    (prompt.length > 0 ? prompt.slice(0, 500) : "");

  const goals = pickStringArray(raw.goals) ?? pickStringArray(raw.objectives) ?? [];
  const actors = pickStringArray(raw.actors) ?? pickStringArray(raw.users) ?? ["User"];
  const constraints = pickStringArray(raw.constraints) ?? [];
  const features =
    pickStringArray(raw.features) ?? pickStringArray(raw.coreFeatures) ?? ["Core functionality"];

  const integrationsRequested =
    pickStringArray(raw.integrationsRequested) ??
    pickStringArray(raw.integrations) ??
    pickStringArray(raw.requestedIntegrations) ??
    [];

  const assumptions = pickStringArray(raw.assumptions) ?? [];

  const warnings = pickStringArray(raw.warnings) ?? [];

  const normalized: Record<string, unknown> = {
    ...raw,
    appName,
    appType,
    summary,
    goals,
    actors,
    constraints,
    entities: normalizeEntities(raw.entities),
    integrationsRequested,
    assumptions,
    warnings,
    features,
    clarificationRequired: false,
  };

  if (typeof raw.confidence === "number") normalized.confidence = raw.confidence;
  if (typeof raw.ambiguityLevel === "string") normalized.ambiguityLevel = raw.ambiguityLevel;
  if (Array.isArray(raw.detectedDomains)) normalized.detectedDomains = pickStringArray(raw.detectedDomains);
  if (typeof raw.prioritizedDomain === "string") normalized.prioritizedDomain = raw.prioritizedDomain;
  if (typeof raw.prioritizationReason === "string") {
    normalized.prioritizationReason = raw.prioritizationReason;
  }
  if (Array.isArray(raw.skippedIntegrations)) {
    normalized.skippedIntegrations = raw.skippedIntegrations;
  }

  return normalized;
}
