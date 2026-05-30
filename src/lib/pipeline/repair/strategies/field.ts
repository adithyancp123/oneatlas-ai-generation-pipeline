import { aiGateway } from "@/lib/ai/gateway";
import { appSpecSchema } from "@/lib/pipeline/validators";
import { errorsForStrategy } from "@/lib/pipeline/repair/repair-log";
import type { AppIntent, AppSpec, DataSchema, EntitySchema, FieldSchema, RelationSchema } from "@/types/domain";
import { buildEntityRefSets, entityRefExists } from "@/lib/pipeline/validators/entity-refs";
import type { ValidationError } from "@/types/job";
import type { PipelineStageId } from "@/types/pipeline";

const TENANT_FIELD: FieldSchema = {
  name: "tenant_id",
  type: "uuid",
  required: true,
  unique: false,
  description: "Tenant identifier (added by repair)",
};

export interface FieldRepairResult {
  repaired: boolean;
  spec: AppSpec;
  fixedCodes: string[];
  escalated: boolean;
}

export interface FieldRepairContext {
  jobId: string;
  prompt: string;
  stageId: PipelineStageId;
  intent: AppIntent;
  dataSchema: DataSchema;
}

function repairDataSchemaRelations(schema: DataSchema): { schema: DataSchema; fixed: boolean } {
  let fixed = false;
  const entities: EntitySchema[] = schema.entities.map((e) => ({
    ...e,
    relations: [...e.relations],
  }));
  const { names, tables } = buildEntityRefSets({ entities });

  for (const entity of entities) {
    entity.relations = entity.relations.filter((rel) => {
      const valid =
        entityRefExists(rel.fromEntity, names, tables) &&
        entityRefExists(rel.toEntity, names, tables);
      if (!valid) fixed = true;
      return valid;
    });
  }

  for (const entity of entities) {
    for (const rel of entity.relations) {
      const target = entities.find(
        (e) => e.tableName === rel.toEntity || e.name === rel.toEntity,
      );
      if (!target) continue;

      const hasReverse = target.relations.some(
        (r) => r.toEntity === entity.tableName || r.toEntity === entity.name,
      );

      if (!hasReverse) {
        const reverse: RelationSchema = {
          name: `reverse_${rel.name}`,
          fromEntity: target.tableName,
          toEntity: entity.tableName,
          cardinality: rel.cardinality,
        };
        const duplicate = target.relations.some(
          (r) => r.toEntity === reverse.toEntity && r.name === reverse.name,
        );
        if (!duplicate) {
          target.relations.push(reverse);
          fixed = true;
        }
      }
    }
  }

  return { schema: { entities }, fixed };
}

function extractEntityNameFromField(field: string): string | null {
  const match = field.match(/entities\.(\d+)|dataSchema\.entities\.(\d+)|\.(\w+)\.fields/);
  if (!match) return null;
  return match[3] ?? null;
}

export function buildFieldCorrectionPrompt(
  error: ValidationError,
  spec: AppSpec,
): string {
  const fieldPath = error.field || error.path;

  if (error.code === "missing_tenant_id") {
    const entityName =
      extractEntityNameFromField(fieldPath) ??
      spec.dataSchema.entities.find((e) => fieldPath.includes(e.tableName))?.name ??
      "the affected entity";
    return [
      `The previous AppSpec output was missing the tenant_id field on entity "${entityName}".`,
      "Return ONLY the corrected entity object JSON (single entity with fields array including tenant_id as uuid).",
      `Validation: ${error.message}`,
      `Current entity snapshot: ${JSON.stringify(spec.dataSchema.entities.find((e) => e.name === entityName || fieldPath.includes(e.tableName)) ?? spec.dataSchema.entities[0]).slice(0, 1500)}`,
    ].join("\n");
  }

  if (error.code === "invalid_table_name") {
    return [
      "The previous output used a non-snake_case tableName.",
      `Fix field at path: ${fieldPath}.`,
      "Return ONLY the corrected entity object JSON with snake_case tableName.",
      `Error: ${error.message}`,
    ].join("\n");
  }

  return [
    `Fix this single field in the AppSpec: ${fieldPath}`,
    `Error (${error.code}): ${error.message}`,
    "Return ONLY the minimal JSON fragment needed to correct this field — not the full AppSpec.",
    `Context snippet: ${JSON.stringify(spec).slice(0, 2000)}`,
  ].join("\n");
}

function applyFieldRepairProgrammatic(
  spec: AppSpec,
  errors: ValidationError[],
): FieldRepairResult {
  let repaired = false;
  const fixedCodes: string[] = [];
  let next = spec;

  for (const error of errors) {
    if (error.code === "missing_tenant_id") {
      next = {
        ...next,
        dataSchema: {
          entities: next.dataSchema.entities.map((entity) => {
            if (entity.fields.some((f) => f.name === "tenant_id")) return entity;
            repaired = true;
            fixedCodes.push("field_add_tenant_id");
            return { ...entity, fields: [...entity.fields, TENANT_FIELD] };
          }),
        },
      };
    }

    if (error.code === "invalid_table_name") {
      next = {
        ...next,
        dataSchema: {
          entities: next.dataSchema.entities.map((entity) => {
            const snake = entity.name
              .replace(/([a-z])([A-Z])/g, "$1_$2")
              .replace(/\s+/g, "_")
              .toLowerCase();
            if (snake === entity.tableName) return entity;
            repaired = true;
            fixedCodes.push("field_fix_table_name");
            return { ...entity, tableName: snake };
          }),
        },
      };
    }

    if (
      error.code === "relation_not_bidirectional" ||
      error.code === "relation_invalid_from" ||
      error.code === "relation_invalid_to"
    ) {
      const relationFix = repairDataSchemaRelations(next.dataSchema);
      if (relationFix.fixed) {
        next = { ...next, dataSchema: relationFix.schema };
        repaired = true;
        fixedCodes.push("field_repair_relations");
      }
    }
  }

  if (next.pages.length === 0) {
    next = {
      ...next,
      pages: [
        {
          id: "page-dashboard",
          name: "Dashboard",
          route: "/dashboard",
          description: "Main dashboard",
          entities: next.dataSchema.entities.map((e) => e.name),
        },
      ],
    };
    repaired = true;
    fixedCodes.push("field_add_default_page");
  }

  return { repaired, spec: next, fixedCodes, escalated: false };
}

/**
 * Field repair: deterministic fixes first, then narrow LLM correction per Zod field path.
 */
export async function repairFields(
  spec: AppSpec,
  errors: ValidationError[],
  context: FieldRepairContext,
): Promise<FieldRepairResult> {
  const fieldErrors = errorsForStrategy("field", errors);
  const programmatic = applyFieldRepairProgrammatic(spec, fieldErrors);
  let next = programmatic.spec;
  const fixedCodes = [...programmatic.fixedCodes];
  let repaired = programmatic.repaired;

  const remaining = fieldErrors.filter((error) => {
    if (error.code === "missing_tenant_id") {
      return !next.dataSchema.entities.every((e) =>
        e.fields.some((f) => f.name === "tenant_id"),
      );
    }
    if (error.code === "invalid_table_name") {
      return next.dataSchema.entities.some((e) => !/^[a-z][a-z0-9_]*$/.test(e.tableName));
    }
    return true;
  });

  let escalated = false;

  for (const error of remaining.slice(0, 2)) {
    const narrowPrompt = buildFieldCorrectionPrompt(error, next);
    try {
      const gw = await aiGateway.generateForStage(
        {
          stageId: "repair",
          prompt: narrowPrompt,
          metadata: { jobId: context.jobId, repairStrategy: "field" },
        },
        appSpecSchema,
      );

      if (!gw.mock && gw.data && typeof gw.data === "object") {
        const fragment = gw.data as Record<string, unknown>;
        if ("tableName" in fragment && "fields" in fragment) {
          const entity = fragment as unknown as EntitySchema;
          next = {
            ...next,
            dataSchema: {
              entities: next.dataSchema.entities.map((e) =>
                e.name === entity.name || e.tableName === entity.tableName ? entity : e,
              ),
            },
          };
          fixedCodes.push("field_llm_entity_correction");
          repaired = true;
        } else if ("version" in fragment) {
          next = fragment as unknown as AppSpec;
          fixedCodes.push("field_llm_appspec_correction");
          repaired = true;
        }
      } else {
        escalated = true;
      }
    } catch {
      escalated = true;
    }
  }

  return {
    repaired,
    spec: next,
    fixedCodes,
    escalated,
  };
}
