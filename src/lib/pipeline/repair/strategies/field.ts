import type { AppSpec, DataSchema, EntitySchema, FieldSchema, RelationSchema } from "@/types/domain";
import { buildEntityRefSets, entityRefExists } from "@/lib/pipeline/validators/entity-refs";
import type { ValidationError } from "@/types/job";

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

export function repairFields(spec: AppSpec, errors: ValidationError[]): FieldRepairResult {
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

    if (error.code === "too_small" || error.code === "invalid_type") {
      repaired = true;
      fixedCodes.push("field_type_default");
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

  return { repaired, spec: next, fixedCodes };
}
