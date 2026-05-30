import { getIntegrationAction } from "@/lib/integrations/registry/definitions";
import { collectValidTriggerIds, parseWorkflowStepRef } from "@/lib/integrations/registry/helpers";
import { validateIntegrationConfig } from "@/lib/integrations/payload-validation";
import { INTEGRATION_REGISTRY } from "@/lib/integrations/registry";
import {
  buildEntityRefSets,
  entityRefExists,
  pageHasMatchingEndpoint,
} from "@/lib/pipeline/validators/entity-refs";
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

export interface ValidateAppSpecOptions {
  /** schemaGeneration stage output — cross-stage entity/table alignment */
  canonicalDataSchema?: DataSchema;
}

function mapZodIssuesToErrors(
  issues: z.ZodIssue[],
  stageId: PipelineStageId,
): ValidationError[] {
  return issues.map((issue) => {
    const path = issue.path.join(".");
    const leaf = issue.path[issue.path.length - 1];

    if (issue.code === "invalid_string" && leaf === "tableName") {
      return err(
        "invalid_table_name",
        "tableName must be snake_case",
        path,
        stageId,
      );
    }

    return {
      code: issue.code,
      message: issue.message,
      field: path,
      path,
      stageId,
    };
  });
}

function zodErrors(error: z.ZodError, stageId: PipelineStageId): ValidationError[] {
  return mapZodIssuesToErrors(error.issues, stageId);
}

function prefixValidationPaths(
  errors: ValidationError[],
  pathPrefix: string,
): ValidationError[] {
  if (!pathPrefix) return errors;
  return errors.map((e) => ({
    ...e,
    path: e.path ? `${pathPrefix}.${e.path}` : pathPrefix,
  }));
}

function remapStageErrors(
  errors: ValidationError[],
  stageId: PipelineStageId,
  pathPrefix?: string,
): ValidationError[] {
  const prefixed = pathPrefix ? prefixValidationPaths(errors, pathPrefix) : errors;
  return prefixed.map((e) => ({ ...e, stageId }));
}

function dedupeErrors(errors: ValidationError[]): ValidationError[] {
  const seen = new Set<string>();
  return errors.filter((e) => {
    const key = `${e.code}|${e.path}|${e.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractPartialDataSchema(output: unknown): unknown {
  if (typeof output !== "object" || output === null) return null;
  const candidate = (output as { dataSchema?: unknown }).dataSchema;
  return candidate ?? null;
}

/** Canonical data-schema rules shared by schemaGeneration and appSpecGeneration. */
export function validateDataSchemaSemantics(
  data: DataSchema,
  stageId: PipelineStageId,
  pathPrefix = "",
): ValidationError[] {
  const errors: ValidationError[] = [];
  const tableNames = new Set<string>();
  const { names, tables } = buildEntityRefSets(data);
  const prefix = pathPrefix ? `${pathPrefix}.` : "";

  for (const entity of data.entities) {
    if (!entity.fields.some((f) => f.name === "tenant_id")) {
      errors.push(
        err(
          "missing_tenant_id",
          `Entity ${entity.name} missing tenant_id`,
          `${prefix}${entity.tableName}.fields`,
          stageId,
        ),
      );
    }

    if (!/^[a-z][a-z0-9_]*$/.test(entity.tableName)) {
      errors.push(
        err(
          "invalid_table_name",
          "tableName must be snake_case",
          `${prefix}${entity.tableName}`,
          stageId,
        ),
      );
    }

    if (tableNames.has(entity.tableName)) {
      errors.push(
        err(
          "duplicate_table_name",
          `Duplicate table ${entity.tableName}`,
          `${prefix}${entity.tableName}`,
          stageId,
        ),
      );
    }
    tableNames.add(entity.tableName);
  }

  for (const entity of data.entities) {
    for (const rel of entity.relations) {
      if (!entityRefExists(rel.fromEntity, names, tables)) {
        errors.push(
          err(
            "relation_invalid_from",
            `Relation ${rel.name} fromEntity ${rel.fromEntity} not found`,
            `${prefix}${entity.tableName}.relations.${rel.name}`,
            stageId,
          ),
        );
      }
      if (!entityRefExists(rel.toEntity, names, tables)) {
        errors.push(
          err(
            "relation_invalid_to",
            `Relation ${rel.name} toEntity ${rel.toEntity} not found`,
            `${prefix}${entity.tableName}.relations.${rel.name}`,
            stageId,
          ),
        );
      }

      const reverseExists = data.entities
        .find((e) => e.tableName === rel.toEntity || e.name === rel.toEntity)
        ?.relations.some(
          (r) => r.toEntity === entity.tableName || r.toEntity === entity.name,
        );

      if (!reverseExists) {
        errors.push(
          err(
            "relation_not_bidirectional",
            `Relation ${rel.name} from ${entity.tableName} lacks reverse edge`,
            `${prefix}${entity.tableName}.relations.${rel.name}`,
            stageId,
          ),
        );
      }
    }
  }

  return errors;
}

function err(
  code: string,
  message: string,
  field: string,
  stageId: PipelineStageId,
): ValidationError {
  return { code, message, field, path: field, stageId };
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

  const errors = validateDataSchemaSemantics(parsed.data, "schemaGeneration");
  return { valid: errors.length === 0, errors };
}

export function validateAppSpec(
  output: unknown,
  options?: ValidateAppSpecOptions,
): ValidationEngineResult {
  const zodResult = appSpecSchema.safeParse(output);
  if (!zodResult.success) {
    const errors = zodErrors(zodResult.error, "appSpecGeneration");
    const partialDataSchema = extractPartialDataSchema(output);
    if (partialDataSchema) {
      const nested = validateDataSchema(partialDataSchema);
      errors.push(
        ...remapStageErrors(nested.errors, "appSpecGeneration", "dataSchema"),
      );
    }
    return { valid: false, errors: dedupeErrors(errors) };
  }

  const spec = zodResult.data as AppSpec;
  const errors: ValidationError[] = [
    ...validateDataSchemaSemantics(spec.dataSchema, "appSpecGeneration", "dataSchema"),
  ];

  const entityNames = new Set(spec.dataSchema.entities.map((e) => e.name));
  const entityNameToTable = new Map(spec.dataSchema.entities.map((e) => [e.name, e.tableName]));
  const registryIds = new Set(INTEGRATION_REGISTRY.map((i) => i.id));
  const roleSet = new Set(spec.auth.roles);

  if (options?.canonicalDataSchema) {
    const canonicalTables = new Set(
      options.canonicalDataSchema.entities.map((e) => e.tableName),
    );
    const canonicalNames = new Set(options.canonicalDataSchema.entities.map((e) => e.name));

    for (const entity of spec.dataSchema.entities) {
      if (!canonicalTables.has(entity.tableName) || !canonicalNames.has(entity.name)) {
        errors.push(
          err(
            "dataschema_stage_mismatch",
            `AppSpec entity ${entity.name} (${entity.tableName}) not in schemaGeneration output`,
            `dataSchema.${entity.tableName}`,
            "appSpecGeneration",
          ),
        );
      }
    }

    for (const entity of options.canonicalDataSchema.entities) {
      if (
        !spec.dataSchema.entities.some(
          (e) => e.tableName === entity.tableName && e.name === entity.name,
        )
      ) {
        errors.push(
          err(
            "dataschema_stage_mismatch",
            `schemaGeneration entity ${entity.name} missing from AppSpec.dataSchema`,
            `dataSchema.${entity.tableName}`,
            "appSpecGeneration",
          ),
        );
      }
    }
  }

  for (const endpoint of spec.apiEndpoints) {
    if (endpoint.boundEntity && !entityNames.has(endpoint.boundEntity)) {
      errors.push(
        err(
          "api_invalid_bound_entity",
          `API ${endpoint.id} boundEntity ${endpoint.boundEntity} unknown`,
          `apiEndpoints.${endpoint.id}.boundEntity`,
          "appSpecGeneration",
        ),
      );
    }
  }

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

    if (page.entities.length === 0) {
      errors.push(
        err(
          "page_missing_entities",
          `Page ${page.name} must reference at least one DataSchema entity`,
          `pages.${page.id}.entities`,
          "appSpecGeneration",
        ),
      );
      continue;
    }

    if (!pageHasMatchingEndpoint(page.entities, spec.apiEndpoints, entityNameToTable)) {
      errors.push(
        err(
          "page_without_endpoint",
          `Page ${page.route} has no API endpoint for any of its entities (${page.entities.join(", ")})`,
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

    const actionDef = getIntegrationAction(hook.integrationId, hook.action);
    if (actionDef && Object.keys(hook.config).length > 0) {
      const configResult = validateIntegrationConfig(hook.config, actionDef.inputSchema);
      if (!configResult.valid) {
        for (const message of configResult.errors) {
          errors.push(
            err(
              "integration_invalid_config",
              message,
              `integrations.${hook.integrationId}.config`,
              "appSpecGeneration",
            ),
          );
        }
      }
    }
  }

  const integrationIds = spec.integrations.map((h) => h.integrationId);
  const validTriggers = collectValidTriggerIds(integrationIds);
  const validActionRefs = new Set(
    integrationIds.flatMap((id) => {
      const def = INTEGRATION_REGISTRY.find((i) => i.id === id);
      return def?.actions.flatMap((a) => [a.id, `${id}:${a.id}`]) ?? [];
    }),
  );

  for (const wf of spec.workflows) {
    if (integrationIds.length > 0 && !validTriggers.has(wf.trigger)) {
      errors.push(
        err(
          "workflow_invalid_trigger",
          `Workflow trigger "${wf.trigger}" is not registered for used integrations`,
          `workflows.${wf.id}.trigger`,
          "appSpecGeneration",
        ),
      );
    }

    if (wf.triggerMeta?.entity) {
      const { names, tables } = buildEntityRefSets(spec.dataSchema);
      if (!entityRefExists(wf.triggerMeta.entity, names, tables)) {
        errors.push(
          err(
            "workflow_invalid_entity",
            `Workflow references unknown DataSchema entity "${wf.triggerMeta.entity}"`,
            `workflows.${wf.id}.triggerMeta.entity`,
            "appSpecGeneration",
          ),
        );
      }
    }

    for (const step of wf.steps) {
      const ref = parseWorkflowStepRef(step, integrationIds);
      if (integrationIds.length > 0 && !ref) {
        errors.push(
          err(
            "workflow_invalid_action",
            `Workflow step "${step}" does not reference a valid integration action`,
            `workflows.${wf.id}.steps`,
            "appSpecGeneration",
          ),
        );
        continue;
      }

      if (ref && !validActionRefs.has(`${ref.integrationId}:${ref.actionId}`)) {
        errors.push(
          err(
            "workflow_invalid_action",
            `Workflow step references unknown action ${ref.actionId} for ${ref.integrationId}`,
            `workflows.${wf.id}.steps`,
            "appSpecGeneration",
          ),
        );
      }
    }

    if (wf.stepMeta) {
      wf.stepMeta.forEach((meta, index) => {
        if (meta.integrationId && !registryIds.has(meta.integrationId)) {
          errors.push(
            err(
              "workflow_invalid_step_integration",
              `stepMeta integration ${meta.integrationId} not in registry`,
              `workflows.${wf.id}.stepMeta.${index}`,
              "appSpecGeneration",
            ),
          );
        }
        if (meta.integrationId && meta.actionId) {
          const action = getIntegrationAction(meta.integrationId, meta.actionId);
          if (!action) {
            errors.push(
              err(
                "workflow_invalid_step_action",
                `stepMeta action ${meta.actionId} invalid for ${meta.integrationId}`,
                `workflows.${wf.id}.stepMeta.${index}`,
                "appSpecGeneration",
              ),
            );
          }
        }
      });
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

  if (spec.auth.permissions) {
    for (const [index, perm] of spec.auth.permissions.entries()) {
      if (!entityNames.has(perm.entity)) {
        errors.push(
          err(
            "auth_permission_unknown_entity",
            `Permission references unknown entity ${perm.entity}`,
            `auth.permissions.${index}.entity`,
            "appSpecGeneration",
          ),
        );
      }
      if (!roleSet.has(perm.role)) {
        errors.push(
          err(
            "auth_permission_unknown_role",
            `Permission role "${perm.role}" is not defined in auth.roles`,
            `auth.permissions.${index}.role`,
            "appSpecGeneration",
          ),
        );
      }
    }
  }

  return { valid: errors.length === 0, errors: dedupeErrors(errors) };
}

export function validateStageOutput(
  stageId: PipelineStageId,
  output: unknown,
  options?: ValidateAppSpecOptions,
): ValidationEngineResult {
  switch (stageId) {
    case "intentExtraction":
      return validateIntent(output);
    case "schemaGeneration":
      return validateDataSchema(output);
    case "appSpecGeneration":
      return validateAppSpec(output, options);
    case "repair":
      return validateAppSpec(output, options);
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
  const specResult = validateAppSpec(appSpec, {
    canonicalDataSchema: dataSchema as DataSchema,
  });

  allErrors.push(...intentResult.errors, ...schemaResult.errors, ...specResult.errors);

  return { valid: allErrors.length === 0, errors: allErrors };
}

/** Alias for assignment/reviewer naming. */
export const validateAppIntent = validateIntent;

export type { DataSchema };
