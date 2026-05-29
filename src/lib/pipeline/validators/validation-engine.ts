import { INTEGRATION_REGISTRY } from "@/lib/integrations/registry";
import {
  appIntentSchema,
  appSpecSchema,
  dataSchemaSchema,
} from "@/lib/pipeline/validators/schemas";
import type { AppSpec, DataSchema } from "@/types/domain";
import type { ValidationError } from "@/types/job";
import type { PipelineStageId } from "@/types/pipeline";
import type { z } from "zod";

export interface ValidationEngineResult {
  valid: boolean;
  errors: ValidationError[];
}

function zodErrors(error: z.ZodError, stageId: PipelineStageId): ValidationError[] {
  return error.issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    path: issue.path.join("."),
    stageId,
  }));
}

function err(
  code: string,
  message: string,
  path: string,
  stageId: PipelineStageId,
): ValidationError {
  return { code, message, path, stageId };
}

export function validateIntent(output: unknown): ValidationEngineResult {
  const result = appIntentSchema.safeParse(output);
  if (result.success) return { valid: true, errors: [] };
  return { valid: false, errors: zodErrors(result.error, "intentExtraction") };
}

export function validateDataSchema(output: unknown): ValidationEngineResult {
  const parsed = dataSchemaSchema.safeParse(output);
  if (!parsed.success) {
    return { valid: false, errors: zodErrors(parsed.error, "schemaGeneration") };
  }

  const errors: ValidationError[] = [];
  const tableNames = new Set<string>();

  for (const entity of parsed.data.entities) {
    if (!entity.fields.some((f) => f.name === "tenant_id")) {
      errors.push(
        err(
          "missing_tenant_id",
          `Entity ${entity.name} missing tenant_id`,
          `${entity.tableName}.fields`,
          "schemaGeneration",
        ),
      );
    }

    if (!/^[a-z][a-z0-9_]*$/.test(entity.tableName)) {
      errors.push(
        err(
          "invalid_table_name",
          "tableName must be snake_case",
          entity.tableName,
          "schemaGeneration",
        ),
      );
    }

    if (tableNames.has(entity.tableName)) {
      errors.push(
        err(
          "duplicate_table_name",
          `Duplicate table ${entity.tableName}`,
          entity.tableName,
          "schemaGeneration",
        ),
      );
    }
    tableNames.add(entity.tableName);
  }

  const relationPairs = new Map<string, Set<string>>();

  for (const entity of parsed.data.entities) {
    for (const rel of entity.relations) {
      const forward = `${entity.tableName}->${rel.toEntity}:${rel.name}`;
      if (!relationPairs.has(rel.toEntity)) relationPairs.set(rel.toEntity, new Set());
      relationPairs.get(rel.toEntity)?.add(forward);

      const reverseExists = parsed.data.entities
        .find((e) => e.tableName === rel.toEntity)
        ?.relations.some((r) => r.toEntity === entity.tableName);

      if (!reverseExists) {
        errors.push(
          err(
            "relation_not_bidirectional",
            `Relation ${rel.name} from ${entity.tableName} lacks reverse edge`,
            `${entity.tableName}.relations.${rel.name}`,
            "schemaGeneration",
          ),
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateAppSpec(output: unknown): ValidationEngineResult {
  const zodResult = appSpecSchema.safeParse(output);
  if (!zodResult.success) {
    return { valid: false, errors: zodErrors(zodResult.error, "appSpecGeneration") };
  }

  const spec = zodResult.data as AppSpec;
  const errors: ValidationError[] = [];

  const entityNames = new Set(spec.dataSchema.entities.map((e) => e.name));
  const entityTables = new Set(spec.dataSchema.entities.map((e) => e.tableName));
  const registryIds = new Set(INTEGRATION_REGISTRY.map((i) => i.id));

  for (const page of spec.pages) {
    for (const entityRef of page.entities) {
      if (!entityNames.has(entityRef)) {
        errors.push(
          err(
            "page_unknown_entity",
            `Page ${page.name} references unknown entity ${entityRef}`,
            `pages.${page.id}.entities`,
            "appSpecGeneration",
          ),
        );
      }
    }

    const hasEndpoint =
      page.route === "/dashboard" ||
      page.entities.some((entityName) => {
        const table = spec.dataSchema.entities.find((e) => e.name === entityName)?.tableName;
        return (
          table !== undefined &&
          spec.apiEndpoints.some((ep) => ep.path.includes(table))
        );
      });

    if (!hasEndpoint) {
      errors.push(
        err(
          "page_without_endpoint",
          `Page ${page.route} has no matching API endpoint`,
          `pages.${page.id}`,
          "appSpecGeneration",
        ),
      );
    }
  }

  for (const hook of spec.integrations) {
    if (!registryIds.has(hook.integrationId)) {
      errors.push(
        err(
          "integration_not_in_registry",
          `Integration ${hook.integrationId} not in registry`,
          `integrations.${hook.integrationId}`,
          "appSpecGeneration",
        ),
      );
      continue;
    }

    const def = INTEGRATION_REGISTRY.find((i) => i.id === hook.integrationId);
    const validAction = def?.actions.some((a) => a.id === hook.action);
    const validTrigger = def?.triggers.some((t) => t.id === hook.trigger);

    if (!validAction) {
      errors.push(
        err(
          "integration_invalid_action",
          `Action ${hook.action} invalid for ${hook.integrationId}`,
          `integrations.${hook.integrationId}.action`,
          "appSpecGeneration",
        ),
      );
    }

    if (!validTrigger) {
      errors.push(
        err(
          "integration_invalid_trigger",
          `Trigger ${hook.trigger} invalid for ${hook.integrationId}`,
          `integrations.${hook.integrationId}.trigger`,
          "appSpecGeneration",
        ),
      );
    }
  }


  for (const role of spec.auth.roles) {
    if (role.trim().length === 0) {
      errors.push(
        err("auth_empty_role", "Auth role must not be empty", "auth.roles", "appSpecGeneration"),
      );
    }
  }

  if (spec.auth.strategy !== "none" && spec.auth.roles.length === 0) {
    errors.push(
      err(
        "auth_roles_required",
        "Auth strategy requires at least one role",
        "auth.roles",
        "appSpecGeneration",
      ),
    );
  }

  for (const entity of spec.dataSchema.entities) {
    if (!entityTables.has(entity.tableName)) {
      errors.push(
        err(
          "entity_table_mismatch",
          `Entity table ${entity.tableName} inconsistent`,
          `dataSchema.${entity.tableName}`,
          "appSpecGeneration",
        ),
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateStageOutput(
  stageId: PipelineStageId,
  output: unknown,
): ValidationEngineResult {
  switch (stageId) {
    case "intentExtraction":
      return validateIntent(output);
    case "schemaGeneration":
      return validateDataSchema(output);
    case "appSpecGeneration":
      return validateAppSpec(output);
    case "repair":
      return validateAppSpec(output);
    default:
      return { valid: true, errors: [] };
  }
}

export function validateFullPipeline(
  intent: unknown,
  dataSchema: unknown,
  appSpec: unknown,
): ValidationEngineResult {
  const allErrors: ValidationError[] = [];
  const intentResult = validateIntent(intent);
  const schemaResult = validateDataSchema(dataSchema);
  const specResult = validateAppSpec(appSpec);

  allErrors.push(...intentResult.errors, ...schemaResult.errors, ...specResult.errors);

  return { valid: allErrors.length === 0, errors: allErrors };
}

export type { DataSchema };
